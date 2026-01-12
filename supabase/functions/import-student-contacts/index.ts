import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tag to Course ID mapping
const TAG_TO_COURSE_ID: Record<string, string> = {
  'TGP': 'f3305afb-c8c5-4632-bba0-5814e003fd25',
  'AFG': '8dc01edc-2bbe-461d-bec2-252c30d6fe8b',
  'PGS': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CGEde': 'ed4cbdcc-fcc4-4e41-aac2-370a61733ca7',
  'CDRde': '80225521-5fd1-4e75-9464-0f358876d208',
  'ABM4': '8a0c51a4-c862-4e3f-b5fa-ba6463c3af89',
  'AEG': 'c5261489-2a98-4ca8-a35a-f03d5d5a7927',
  'BTL': '9adf9995-c5c5-4ba4-8fd0-b3cb28cbd367',
  'BDRde': 'ccea69af-df28-4cd6-ad30-2f4bea656754',
  'BGT': 'ecb0f2a5-a7fa-4c32-9050-8daff5713390',
  'CGM': '14760b07-88e7-4e3b-8f3b-451c695b8144',
  'DGO': '75c95327-1d42-48ec-8d48-ba8c6e076984',
  'FCR': 'e5a2e5b6-9f21-48fd-85e3-0cf194d3df74',
  'FVM': '9c7a4bdd-24ca-467f-a63a-01a4fd9972e2',
  'ABMde': 'f509397a-4af2-4a77-b64b-de4f30261355',
  'CAG': '7b4e25dd-a236-4a18-99fe-1110847a9701',
  'SDO': '42676454-d253-4d3f-995b-be7698caabb8',
  'CMG': '3a1c7056-d1f4-49cc-8f5f-038e3fc3f375',
  'WRE': '4f9afc85-b38a-46e2-afcb-b75b13c83f66',
  'TBE': 'a102fd6e-0e93-49a7-b1bf-26ae2e53bbbc',
  'TFG': 'c6de4f22-d1ca-430f-8119-c7a9543f4c6e',
  'GTL': '0ed04b79-2af2-4140-97b0-d337c79792a6',
  'TCBE': 'a9039d98-5cd9-4b7e-8234-5bfe50fad462',
  'TMFG': '291bacb7-8ce0-4f2a-86f4-8b36668535a5',
  'UFG': '08830ab4-a07f-43d0-a3c4-1398394acfe7',
  'CGE': 'f0104c36-c1c6-404a-bdfd-2da421175ddc',
  'KMG': '6b41a4b0-4aff-4ca5-8f87-984383fd5ec9',
  'LAFGde': '3574447a-735d-4f67-9dc2-4278abc90f36',
  'MGE': 'f55491ed-e6c8-49e6-abf4-10a5183e5e42',
  'MGS': 'd48c003f-f51c-4cef-a5fb-4c724bf07682',
  'SVM': '0d1edb46-42d5-4e8c-bfba-70d5a559695e',
  'BTD': 'fdc4aba0-94e3-4952-9120-1d83bb47681f',
  'HSG2': '8a0cc563-2bf3-4ce8-b548-32adadf0accc',
  'CGE2': 'd7494813-8f40-4127-833d-63c9418ec46f',
  'Tour Booking': '975553eb-bb5e-4c2b-b225-61fe14844b87',
  'Tour Booking 2024': '975553eb-bb5e-4c2b-b225-61fe14844b87',
  'HSGde': '8ffb9e1c-7d81-49b0-8929-170ddf1aa1f8',
  'LAFG2': '1f24f046-9c95-46a2-90c7-a5e2bf29ce61',
  'CDR': 'ef8c3c27-4256-4b31-a0fc-02da23734127',
  'BDR2': 'e34a2803-5078-43a6-93ec-f21842ce7e90',
  'ABM': 'a7aaa317-3ce0-4ece-8b38-d9e8ff8b7100',
  'ABM2': '72ffca20-732e-43a8-8722-d020461376e3',
  'BDR': '1a83516d-8277-4868-aa74-437c0483db03',
  'ABM3': '548e8531-2efc-4e82-93f6-ec6b55e4d900',
  'LAFG': 'eef4e114-ae30-4911-96b1-7152834aa57b',
  'HSG': '3b9560cc-0d6a-48eb-b70d-b84b76c41995',
  '100 Guitar Tips': 'a1b2c3d4-1111-4444-8888-000000000001',
  'Guitar Tips: 101-150': 'a1b2c3d4-2222-4444-8888-000000000002',
  'TAOP': 'a1b2c3d4-3333-4444-8888-000000000003',
};

// Course IDs in "Access All Courses" group for Members
const ACCESS_ALL_COURSES_IDS = [
  'f509397a-4af2-4a77-b64b-de4f30261355', '8a0c51a4-c862-4e3f-b5fa-ba6463c3af89',
  'c5261489-2a98-4ca8-a35a-f03d5d5a7927', '8dc01edc-2bbe-461d-bec2-252c30d6fe8b',
  '9adf9995-c5c5-4ba4-8fd0-b3cb28cbd367', 'ccea69af-df28-4cd6-ad30-2f4bea656754',
  'ecb0f2a5-a7fa-4c32-9050-8daff5713390', '7b4e25dd-a236-4a18-99fe-1110847a9701',
  '14760b07-88e7-4e3b-8f3b-451c695b8144', '80225521-5fd1-4e75-9464-0f358876d208',
  '6b41a4b0-4aff-4ca5-8f87-984383fd5ec9', '975553eb-bb5e-4c2b-b225-61fe14844b87',
  'ed4cbdcc-fcc4-4e41-aac2-370a61733ca7', '3a1c7056-d1f4-49cc-8f5f-038e3fc3f375',
  '75c95327-1d42-48ec-8d48-ba8c6e076984', 'e5a2e5b6-9f21-48fd-85e3-0cf194d3df74',
  '9c7a4bdd-24ca-467f-a63a-01a4fd9972e2', '0ed04b79-2af2-4140-97b0-d337c79792a6',
  '8ffb9e1c-7d81-49b0-8929-170ddf1aa1f8', '3574447a-735d-4f67-9dc2-4278abc90f36',
  'f55491ed-e6c8-49e6-abf4-10a5183e5e42', '08830ab4-a07f-43d0-a3c4-1398394acfe7',
  'a9039d98-5cd9-4b7e-8234-5bfe50fad462', 'f3305afb-c8c5-4632-bba0-5814e003fd25',
  'c6de4f22-d1ca-430f-8119-c7a9543f4c6e', '291bacb7-8ce0-4f2a-86f4-8b36668535a5',
  'a102fd6e-0e93-49a7-b1bf-26ae2e53bbbc', 'fdc4aba0-94e3-4952-9120-1d83bb47681f',
  '0d1edb46-42d5-4e8c-bfba-70d5a559695e', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'd48c003f-f51c-4cef-a5fb-4c724bf07682', '42676454-d253-4d3f-995b-be7698caabb8',
  '4f9afc85-b38a-46e2-afcb-b75b13c83f66',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { students } = await req.json();
    
    if (!students || !Array.isArray(students)) {
      return new Response(
        JSON.stringify({ error: 'Students array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[IMPORT] Processing ${students.length} students`);

    // Get all profiles with emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profilesError) throw profilesError;

    // Create email to profile ID map (case-insensitive)
    const emailToProfileId: Record<string, string> = {};
    for (const profile of profiles || []) {
      if (profile.email) {
        emailToProfileId[profile.email.toLowerCase()] = profile.id;
      }
    }

    console.log(`[IMPORT] Found ${Object.keys(emailToProfileId).length} profiles`);

    // Get ALL existing enrollments
    const { data: existingEnrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('user_id, course_id');

    if (enrollmentsError) throw enrollmentsError;

    const existingEnrollmentSet = new Set(
      (existingEnrollments || []).map(e => `${e.user_id}|${e.course_id}`)
    );

    console.log(`[IMPORT] Found ${existingEnrollmentSet.size} existing enrollments`);

    let updatedProfiles = 0;
    let createdEnrollments = 0;
    let skippedNoMatch = 0;
    const errors: string[] = [];

    // Process students
    for (const student of students) {
      const email = (student.email || '').toLowerCase().trim();
      if (!email) {
        skippedNoMatch++;
        continue;
      }

      const profileId = emailToProfileId[email];
      if (!profileId) {
        skippedNoMatch++;
        continue;
      }

      // Parse tags
      const tagsString = student.tags || '';
      const tags = tagsString.split(',').map((t: string) => t.trim()).filter(Boolean);

      // Update profile with tags
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          tags,
          is_public: false,
          email_verified: true
        })
        .eq('id', profileId);

      if (updateError) {
        errors.push(`Update ${email}: ${updateError.message}`);
        continue;
      }

      updatedProfiles++;

      // Collect course IDs to enroll
      const courseIdsToEnroll = new Set<string>();

      // Check for Member tag - grant access to all courses
      const isMember = tags.some((t: string) => 
        t.toLowerCase() === 'member' || t.toLowerCase() === 'lifetime member'
      );

      if (isMember) {
        for (const courseId of ACCESS_ALL_COURSES_IDS) {
          courseIdsToEnroll.add(courseId);
        }
      }

      // Map individual tags to courses
      for (const tag of tags) {
        const courseId = TAG_TO_COURSE_ID[tag];
        if (courseId) {
          courseIdsToEnroll.add(courseId);
        }
      }

      // Create enrollments for new courses only
      const enrollmentsToCreate: Array<{user_id: string; course_id: string; enrollment_type: string; is_active: boolean}> = [];
      for (const courseId of courseIdsToEnroll) {
        const key = `${profileId}|${courseId}`;
        if (!existingEnrollmentSet.has(key)) {
          enrollmentsToCreate.push({
            user_id: profileId,
            course_id: courseId,
            enrollment_type: 'import',
            is_active: true,
          });
          existingEnrollmentSet.add(key);
        }
      }

      if (enrollmentsToCreate.length > 0) {
        const { error: enrollError } = await supabase
          .from('course_enrollments')
          .insert(enrollmentsToCreate);

        if (enrollError) {
          errors.push(`Enroll ${email}: ${enrollError.message}`);
        } else {
          createdEnrollments += enrollmentsToCreate.length;
        }
      }
    }

    console.log(`[IMPORT] Complete: ${updatedProfiles} profiles updated, ${createdEnrollments} enrollments created`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedProfiles,
        createdEnrollments,
        skippedNoMatch,
        errors: errors.slice(0, 20),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[IMPORT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
