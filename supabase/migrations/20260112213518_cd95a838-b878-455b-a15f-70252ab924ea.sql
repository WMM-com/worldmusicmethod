-- Create function to enroll all users based on their tags
CREATE OR REPLACE FUNCTION public.enroll_users_from_tags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_rec RECORD;
  tag_rec RECORD;
  course_rec RECORD;
  v_course_id UUID;
  enrolled_count INT := 0;
  users_processed INT := 0;
  member_enrolled INT := 0;
  
  -- Access All Courses group courses
  access_all_course_ids UUID[] := ARRAY[
    '08830ab4-a07f-43d0-a3c4-1398394acfe7'::UUID, '0d1edb46-42d5-4e8c-bfba-70d5a559695e'::UUID,
    '0ed04b79-2af2-4140-97b0-d337c79792a6'::UUID, '14760b07-88e7-4e3b-8f3b-451c695b8144'::UUID,
    '291bacb7-8ce0-4f2a-86f4-8b36668535a5'::UUID, '3574447a-735d-4f67-9dc2-4278abc90f36'::UUID,
    '3a1c7056-d1f4-49cc-8f5f-038e3fc3f375'::UUID, '42676454-d253-4d3f-995b-be7698caabb8'::UUID,
    '4f9afc85-b38a-46e2-afcb-b75b13c83f66'::UUID, '6b41a4b0-4aff-4ca5-8f87-984383fd5ec9'::UUID,
    '75c95327-1d42-48ec-8d48-ba8c6e076984'::UUID, '7b4e25dd-a236-4a18-99fe-1110847a9701'::UUID,
    '80225521-5fd1-4e75-9464-0f358876d208'::UUID, '8a0c51a4-c862-4e3f-b5fa-ba6463c3af89'::UUID,
    '8dc01edc-2bbe-461d-bec2-252c30d6fe8b'::UUID, '8ffb9e1c-7d81-49b0-8929-170ddf1aa1f8'::UUID,
    '975553eb-bb5e-4c2b-b225-61fe14844b87'::UUID, '9adf9995-c5c5-4ba4-8fd0-b3cb28cbd367'::UUID,
    '9c7a4bdd-24ca-467f-a63a-01a4fd9972e2'::UUID, 'a102fd6e-0e93-49a7-b1bf-26ae2e53bbbc'::UUID,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'a9039d98-5cd9-4b7e-8234-5bfe50fad462'::UUID,
    'c5261489-2a98-4ca8-a35a-f03d5d5a7927'::UUID, 'c6de4f22-d1ca-430f-8119-c7a9543f4c6e'::UUID,
    'ccea69af-df28-4cd6-ad30-2f4bea656754'::UUID, 'd48c003f-f51c-4cef-a5fb-4c724bf07682'::UUID,
    'e5a2e5b6-9f21-48fd-85e3-0cf194d3df74'::UUID, 'ecb0f2a5-a7fa-4c32-9050-8daff5713390'::UUID,
    'ed4cbdcc-fcc4-4e41-aac2-370a61733ca7'::UUID, 'f3305afb-c8c5-4632-bba0-5814e003fd25'::UUID,
    'f509397a-4af2-4a77-b64b-de4f30261355'::UUID, 'f55491ed-e6c8-49e6-abf4-10a5183e5e42'::UUID,
    'fdc4aba0-94e3-4952-9120-1d83bb47681f'::UUID
  ];
  
  -- Tag to course mapping
  tag_course_map JSONB := '{
    "TGP": "f3305afb-c8c5-4632-bba0-5814e003fd25",
    "AFG": "8dc01edc-2bbe-461d-bec2-252c30d6fe8b",
    "PGS": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "CGEde": "ed4cbdcc-fcc4-4e41-aac2-370a61733ca7",
    "CDRde": "80225521-5fd1-4e75-9464-0f358876d208",
    "ABM4": "8a0c51a4-c862-4e3f-b5fa-ba6463c3af89",
    "AEG": "c5261489-2a98-4ca8-a35a-f03d5d5a7927",
    "BTL": "9adf9995-c5c5-4ba4-8fd0-b3cb28cbd367",
    "BDRde": "ccea69af-df28-4cd6-ad30-2f4bea656754",
    "BGT": "ecb0f2a5-a7fa-4c32-9050-8daff5713390",
    "CGM": "14760b07-88e7-4e3b-8f3b-451c695b8144",
    "DGO": "75c95327-1d42-48ec-8d48-ba8c6e076984",
    "FCR": "e5a2e5b6-9f21-48fd-85e3-0cf194d3df74",
    "FVM": "9c7a4bdd-24ca-467f-a63a-01a4fd9972e2",
    "ABMde": "f509397a-4af2-4a77-b64b-de4f30261355",
    "CAG": "7b4e25dd-a236-4a18-99fe-1110847a9701",
    "SDO": "42676454-d253-4d3f-995b-be7698caabb8",
    "CMG": "3a1c7056-d1f4-49cc-8f5f-038e3fc3f375",
    "WRE": "4f9afc85-b38a-46e2-afcb-b75b13c83f66",
    "TBE": "a102fd6e-0e93-49a7-b1bf-26ae2e53bbbc",
    "TFG": "c6de4f22-d1ca-430f-8119-c7a9543f4c6e",
    "GTL": "0ed04b79-2af2-4140-97b0-d337c79792a6",
    "TCBE": "a9039d98-5cd9-4b7e-8234-5bfe50fad462",
    "TMFG": "291bacb7-8ce0-4f2a-86f4-8b36668535a5",
    "UFG": "08830ab4-a07f-43d0-a3c4-1398394acfe7",
    "CGE": "f0104c36-c1c6-404a-bdfd-2da421175ddc",
    "KMG": "6b41a4b0-4aff-4ca5-8f87-984383fd5ec9",
    "LAFGde": "3574447a-735d-4f67-9dc2-4278abc90f36",
    "MGE": "f55491ed-e6c8-49e6-abf4-10a5183e5e42",
    "MGS": "d48c003f-f51c-4cef-a5fb-4c724bf07682",
    "SVM": "0d1edb46-42d5-4e8c-bfba-70d5a559695e",
    "BTD": "fdc4aba0-94e3-4952-9120-1d83bb47681f",
    "HSG2": "8a0cc563-2bf3-4ce8-b548-32adadf0accc",
    "CGE2": "d7494813-8f40-4127-833d-63c9418ec46f",
    "Tour Booking": "975553eb-bb5e-4c2b-b225-61fe14844b87",
    "HSGde": "8ffb9e1c-7d81-49b0-8929-170ddf1aa1f8",
    "LAFG2": "1f24f046-9c95-46a2-90c7-a5e2bf29ce61",
    "CDR": "ef8c3c27-4256-4b31-a0fc-02da23734127",
    "BDR2": "e34a2803-5078-43a6-93ec-f21842ce7e90",
    "ABM": "a7aaa317-3ce0-4ece-8b38-d9e8ff8b7100",
    "ABM2": "72ffca20-732e-43a8-8722-d020461376e3",
    "BDR": "1a83516d-8277-4868-aa74-437c0483db03",
    "ABM3": "548e8531-2efc-4e82-93f6-ec6b55e4d900",
    "LAFG": "eef4e114-ae30-4911-96b1-7152834aa57b",
    "HSG": "3b9560cc-0d6a-48eb-b70d-b84b76c41995"
  }'::JSONB;
  
  is_member BOOLEAN;
  c_id UUID;
BEGIN
  -- Get distinct users with tags from user_tags
  FOR user_rec IN 
    SELECT DISTINCT ut.user_id, p.email
    FROM user_tags ut
    JOIN profiles p ON p.id = ut.user_id
    WHERE ut.user_id IS NOT NULL
  LOOP
    users_processed := users_processed + 1;
    is_member := false;
    
    -- Check if user has Member or Lifetime Member tag
    SELECT EXISTS (
      SELECT 1 FROM user_tags ut2
      JOIN email_tags et ON et.id = ut2.tag_id
      WHERE ut2.user_id = user_rec.user_id
      AND lower(et.name) IN ('member', 'lifetime member')
    ) INTO is_member;
    
    -- If member, enroll in all courses
    IF is_member THEN
      FOREACH c_id IN ARRAY access_all_course_ids
      LOOP
        INSERT INTO course_enrollments (user_id, course_id, enrollment_type, is_active)
        VALUES (user_rec.user_id, c_id, 'subscription', true)
        ON CONFLICT (user_id, course_id) DO NOTHING;
        
        IF FOUND THEN
          member_enrolled := member_enrolled + 1;
        END IF;
      END LOOP;
    END IF;
    
    -- Get all tags for this user and enroll in matching courses
    FOR tag_rec IN 
      SELECT et.name as tag_name
      FROM user_tags ut
      JOIN email_tags et ON et.id = ut.tag_id
      WHERE ut.user_id = user_rec.user_id
    LOOP
      -- Check if this tag maps to a course
      IF tag_course_map ? tag_rec.tag_name THEN
        v_course_id := (tag_course_map->>tag_rec.tag_name)::UUID;
        
        -- Enroll user in the course
        INSERT INTO course_enrollments (user_id, course_id, enrollment_type, is_active)
        VALUES (user_rec.user_id, v_course_id, 'purchase', true)
        ON CONFLICT (user_id, course_id) DO NOTHING;
        
        IF FOUND THEN
          enrolled_count := enrolled_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'users_processed', users_processed,
    'tag_based_enrollments', enrolled_count,
    'member_enrollments', member_enrolled,
    'total_new_enrollments', enrolled_count + member_enrolled
  );
END;
$$;