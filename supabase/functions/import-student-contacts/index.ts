import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[IMPORT-STUDENTS] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error('Invalid authorization');
    }

    // Check if requesting user is an admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: requestingUser.id,
      _role: 'admin',
    });

    if (isAdmin !== true) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { students, mode = 'preview' } = await req.json();

    if (!students || !Array.isArray(students)) {
      throw new Error('Missing required field: students (array)');
    }

    logStep('Processing import request', { studentCount: students.length, mode });

    // Fetch all courses with their tags for enrollment matching
    const { data: allCourses } = await supabaseAdmin
      .from('courses')
      .select('id, title, tags');
    
    // Map course tags to course IDs (case-insensitive)
    const tagToCourseId = new Map<string, { id: string; title: string }>();
    allCourses?.forEach(course => {
      if (course.tags && Array.isArray(course.tags)) {
        course.tags.forEach((tag: string) => {
          tagToCourseId.set(tag.toLowerCase().trim(), { id: course.id, title: course.title });
        });
      }
    });

    // Fetch the "Access All Courses" group and its courses
    const { data: accessAllGroup } = await supabaseAdmin
      .from('course_groups')
      .select('id, name')
      .eq('name', 'Access All Courses')
      .maybeSingle();

    let accessAllCourseIds: string[] = [];
    if (accessAllGroup) {
      const { data: groupCourses } = await supabaseAdmin
        .from('course_group_courses')
        .select('course_id')
        .eq('group_id', accessAllGroup.id);
      
      accessAllCourseIds = groupCourses?.map(gc => gc.course_id) || [];
    }

    logStep('Loaded reference data', { 
      coursesCount: allCourses?.length,
      courseTagMappings: tagToCourseId.size,
      accessAllCourseCount: accessAllCourseIds.length
    });

    const results = {
      total: students.length,
      created: 0,
      updated: 0,
      skipped: 0,
      enrollmentsAdded: 0,
      memberEnrollments: 0,
      errors: [] as { email: string; error: string }[],
      preview: [] as { 
        email: string; 
        name: string; 
        status: string; 
        tags?: string[]; 
        enrollments?: string[];
        isMember?: boolean;
      }[],
    };

    for (const student of students) {
      const firstName = (student.firstName || student.first_name || '').trim();
      const lastName = (student.lastName || student.last_name || '').trim();
      const email = (student.email || '').toLowerCase().trim();
      const tagsString = student.tags || '';
      
      // Parse tags - they're comma-separated
      const userTags: string[] = tagsString
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);

      if (!email) {
        results.errors.push({ email: 'unknown', error: 'Missing email address' });
        continue;
      }

      const fullName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
      
      // Check if user has Member tag (case-insensitive)
      const isMember = userTags.some(tag => 
        tag.toLowerCase() === 'member' || tag.toLowerCase() === 'lifetime member'
      );

      // Find courses to enroll based on tags
      const courseIdsToEnroll = new Set<string>();
      const courseNamesToEnroll: string[] = [];
      
      userTags.forEach(tagName => {
        const courseInfo = tagToCourseId.get(tagName.toLowerCase().trim());
        if (courseInfo && !courseIdsToEnroll.has(courseInfo.id)) {
          courseIdsToEnroll.add(courseInfo.id);
          courseNamesToEnroll.push(courseInfo.title);
        }
      });

      // If user is a Member, add all courses from "Access All Courses" group
      if (isMember && accessAllCourseIds.length > 0) {
        accessAllCourseIds.forEach(courseId => {
          if (!courseIdsToEnroll.has(courseId)) {
            courseIdsToEnroll.add(courseId);
            const course = allCourses?.find(c => c.id === courseId);
            if (course) {
              courseNamesToEnroll.push(course.title + ' (Member)');
            }
          }
        });
      }

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, tags')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        // USER EXISTS - Update their tags and enroll in missing courses
        if (mode === 'preview') {
          results.preview.push({ 
            email, 
            name: fullName, 
            status: 'will_update',
            tags: userTags,
            enrollments: courseNamesToEnroll,
            isMember
          });
          continue;
        }

        try {
          // Update profile with tags and ensure private visibility
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              tags: userTags,
              is_public: false,
              first_name: firstName || null,
              last_name: lastName || null,
              email_verified: true,
              email_verified_at: new Date().toISOString(),
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            logStep('Profile update error', { email, error: updateError.message });
          }

          // Get existing enrollments for this user
          const { data: existingEnrollments } = await supabaseAdmin
            .from('course_enrollments')
            .select('course_id')
            .eq('user_id', existingProfile.id);

          const existingCourseIds = new Set(existingEnrollments?.map(e => e.course_id) || []);

          // Find courses to add (not already enrolled)
          const newCourseIds = Array.from(courseIdsToEnroll).filter(id => !existingCourseIds.has(id));

          if (newCourseIds.length > 0) {
            const enrollmentInserts = newCourseIds.map(courseId => ({
              user_id: existingProfile.id,
              course_id: courseId,
              enrollment_type: isMember && accessAllCourseIds.includes(courseId) ? 'member' : 'import',
              enrolled_by: requestingUser.id,
            }));

            const { error: enrollError } = await supabaseAdmin
              .from('course_enrollments')
              .insert(enrollmentInserts);

            if (enrollError) {
              logStep('Enrollment error for existing user', { email, error: enrollError.message });
            } else {
              results.enrollmentsAdded += newCourseIds.length;
              if (isMember) {
                results.memberEnrollments += accessAllCourseIds.filter(id => newCourseIds.includes(id)).length;
              }
              logStep('Enrolled existing user in courses', { email, newEnrollments: newCourseIds.length });
            }
          }

          results.updated++;
          results.preview.push({ 
            email, 
            name: fullName, 
            status: 'updated',
            tags: userTags,
            enrollments: courseNamesToEnroll,
            isMember
          });
          logStep('Updated existing user', { email, newEnrollments: newCourseIds.length });

        } catch (updateErr: any) {
          logStep('Error updating existing user', { email, error: updateErr.message });
          results.errors.push({ email, error: updateErr.message });
        }
        continue;
      }

      // NEW USER - Create account
      if (mode === 'preview') {
        results.preview.push({ 
          email, 
          name: fullName, 
          status: 'will_create',
          tags: userTags,
          enrollments: courseNamesToEnroll,
          isMember
        });
        continue;
      }

      try {
        // Create user with a random password (they'll use password reset)
        const tempPassword = crypto.randomUUID() + 'Aa1!';
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName,
            imported_from: 'student_contacts_csv',
          },
        });

        if (createError) {
          if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
            results.skipped++;
            results.preview.push({ email, name: fullName, status: 'exists_in_auth', isMember });
          } else {
            results.errors.push({ email, error: createError.message });
          }
          continue;
        }

        logStep('User created', { email, userId: newUser.user.id });

        // Update profile: set as private, mark email verified, set name and tags
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: fullName,
            first_name: firstName || null,
            last_name: lastName || null,
            tags: userTags,
            email_verified: true, 
            email_verified_at: new Date().toISOString(),
            is_public: false, // All imported users are private
          })
          .eq('id', newUser.user.id);

        if (profileUpdateError) {
          logStep('Profile update error', { email, error: profileUpdateError.message });
        }

        // Enroll in courses based on matching tags (and Member access)
        const courseIdsArray = Array.from(courseIdsToEnroll);
        if (courseIdsArray.length > 0) {
          const enrollmentInserts = courseIdsArray.map(courseId => ({
            user_id: newUser.user.id,
            course_id: courseId,
            enrollment_type: isMember && accessAllCourseIds.includes(courseId) ? 'member' : 'import',
            enrolled_by: requestingUser.id,
          }));

          const { error: enrollError } = await supabaseAdmin
            .from('course_enrollments')
            .insert(enrollmentInserts);

          if (enrollError) {
            logStep('Enrollment error', { email, error: enrollError.message });
          } else {
            results.enrollmentsAdded += courseIdsArray.length;
            if (isMember) {
              results.memberEnrollments += accessAllCourseIds.filter(id => courseIdsToEnroll.has(id)).length;
            }
            logStep('Enrolled in courses', { email, count: courseIdsArray.length });
          }
        }

        results.created++;
        results.preview.push({ 
          email, 
          name: fullName, 
          status: 'created',
          tags: userTags,
          enrollments: courseNamesToEnroll,
          isMember
        });

      } catch (userError: any) {
        logStep('Error creating user', { email, error: userError.message });
        results.errors.push({ email, error: userError.message });
      }
    }

    logStep('Import complete', { 
      created: results.created, 
      updated: results.updated,
      skipped: results.skipped, 
      enrollmentsAdded: results.enrollmentsAdded,
      memberEnrollments: results.memberEnrollments,
      errors: results.errors.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: mode === 'preview' 
          ? `Preview: ${results.preview.filter(p => p.status === 'will_create').length} users will be created, ${results.preview.filter(p => p.status === 'will_update').length} will be updated`
          : `Created ${results.created} users, updated ${results.updated} existing users, ${results.enrollmentsAdded} course enrollments added (${results.memberEnrollments} from Member access), ${results.errors.length} errors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
