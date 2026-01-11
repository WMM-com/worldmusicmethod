import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[IMPORT-WP-USERS] ${step}`, details ? JSON.stringify(details) : '');
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

    const { users, mode = 'preview' } = await req.json();

    if (!users || !Array.isArray(users)) {
      throw new Error('Missing required field: users (array)');
    }

    logStep('Processing import request', { userCount: users.length, mode });

    // Fetch all tags for matching
    const { data: allTags } = await supabaseAdmin
      .from('email_tags')
      .select('id, name');
    
    const tagNameToId = new Map<string, string>();
    allTags?.forEach(tag => {
      tagNameToId.set(tag.name.toLowerCase(), tag.id);
    });

    // Fetch all courses with their tags for enrollment matching
    const { data: allCourses } = await supabaseAdmin
      .from('courses')
      .select('id, title, tags');
    
    // Map course tags to course IDs
    const tagToCourseId = new Map<string, string>();
    allCourses?.forEach(course => {
      if (course.tags && Array.isArray(course.tags)) {
        course.tags.forEach((tag: string) => {
          tagToCourseId.set(tag.toLowerCase(), course.id);
        });
      }
    });

    logStep('Loaded reference data', { 
      tagsCount: tagNameToId.size, 
      coursesCount: allCourses?.length,
      courseTagMappings: tagToCourseId.size 
    });

    const results = {
      total: users.length,
      created: 0,
      skipped: 0,
      tagsAdded: 0,
      enrollmentsAdded: 0,
      errors: [] as { email: string; error: string }[],
      preview: [] as { email: string; name: string; status: string; tags?: string[]; enrollments?: string[] }[],
    };

    for (const wpUser of users) {
      const email = (wpUser.email || wpUser.user_email || '').toLowerCase().trim();
      const fullName = wpUser.display_name || wpUser.name || wpUser.user_nicename || email.split('@')[0];
      const wpPasswordHash = wpUser.user_pass || wpUser.password_hash;
      const userTags: string[] = wpUser.tags || [];

      if (!email) {
        results.errors.push({ email: 'unknown', error: 'Missing email address' });
        continue;
      }

      // Find matching tag IDs
      const matchedTagIds: string[] = [];
      const matchedTagNames: string[] = [];
      userTags.forEach(tagName => {
        const tagId = tagNameToId.get(tagName.toLowerCase().trim());
        if (tagId) {
          matchedTagIds.push(tagId);
          matchedTagNames.push(tagName);
        }
      });

      // Find courses to enroll based on tags
      const courseIdsToEnroll: string[] = [];
      const courseNamesToEnroll: string[] = [];
      userTags.forEach(tagName => {
        const courseId = tagToCourseId.get(tagName.toLowerCase().trim());
        if (courseId) {
          const course = allCourses?.find(c => c.id === courseId);
          if (course && !courseIdsToEnroll.includes(courseId)) {
            courseIdsToEnroll.push(courseId);
            courseNamesToEnroll.push(course.title);
          }
        }
      });

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        results.skipped++;
        results.preview.push({ 
          email, 
          name: fullName, 
          status: 'exists',
          tags: matchedTagNames,
          enrollments: courseNamesToEnroll 
        });
        logStep('User already exists', { email });
        continue;
      }

      if (mode === 'preview') {
        results.preview.push({ 
          email, 
          name: fullName, 
          status: 'will_create',
          tags: matchedTagNames,
          enrollments: courseNamesToEnroll
        });
        continue;
      }

      // Import mode - create the user
      try {
        // WordPress uses PHPass which Supabase doesn't support natively
        // Create user with a random password
        const tempPassword = crypto.randomUUID() + 'Aa1!'; // Ensure it meets password requirements
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm since they were already confirmed in WordPress
          user_metadata: {
            full_name: fullName,
            imported_from: 'wordpress',
            wp_password_hash: wpPasswordHash ? 'stored' : 'none',
          },
        });

        if (createError) {
          if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
            results.skipped++;
            results.preview.push({ email, name: fullName, status: 'exists_in_auth' });
          } else {
            results.errors.push({ email, error: createError.message });
          }
          continue;
        }

        logStep('User created', { email, userId: newUser.user.id });

        // Update profile: set as private, mark email verified, store WP hash
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: fullName,
            email_verified: true, 
            email_verified_at: new Date().toISOString(),
            is_public: false, // Set imported users as private by default
            wp_password_hash: wpPasswordHash || null,
          })
          .eq('id', newUser.user.id);

        if (profileUpdateError) {
          logStep('Profile update error', { email, error: profileUpdateError.message });
        }

        // Assign tags to the user
        if (matchedTagIds.length > 0) {
          const tagInserts = matchedTagIds.map(tagId => ({
            user_id: newUser.user.id,
            email: email,
            tag_id: tagId,
            source: 'import',
          }));

          const { error: tagError } = await supabaseAdmin
            .from('user_tags')
            .insert(tagInserts);

          if (tagError) {
            logStep('Tag assignment error', { email, error: tagError.message });
          } else {
            results.tagsAdded += matchedTagIds.length;
            logStep('Tags assigned', { email, count: matchedTagIds.length });
          }
        }

        // Enroll in courses based on matching tags
        if (courseIdsToEnroll.length > 0) {
          const enrollmentInserts = courseIdsToEnroll.map(courseId => ({
            user_id: newUser.user.id,
            course_id: courseId,
            enrollment_type: 'import',
            enrolled_by: requestingUser.id,
          }));

          const { error: enrollError } = await supabaseAdmin
            .from('course_enrollments')
            .insert(enrollmentInserts);

          if (enrollError) {
            logStep('Enrollment error', { email, error: enrollError.message });
          } else {
            results.enrollmentsAdded += courseIdsToEnroll.length;
            logStep('Enrolled in courses', { email, count: courseIdsToEnroll.length });
          }
        }

        results.created++;
        results.preview.push({ 
          email, 
          name: fullName, 
          status: 'created',
          tags: matchedTagNames,
          enrollments: courseNamesToEnroll
        });

      } catch (userError: any) {
        logStep('Error creating user', { email, error: userError.message });
        results.errors.push({ email, error: userError.message });
      }
    }

    logStep('Import complete', { 
      created: results.created, 
      skipped: results.skipped, 
      tagsAdded: results.tagsAdded,
      enrollmentsAdded: results.enrollmentsAdded,
      errors: results.errors.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: mode === 'preview' 
          ? `Preview: ${results.preview.filter(p => p.status === 'will_create').length} users will be created, ${results.skipped} already exist`
          : `Created ${results.created} users (${results.tagsAdded} tags, ${results.enrollmentsAdded} enrollments), skipped ${results.skipped} existing, ${results.errors.length} errors`
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
