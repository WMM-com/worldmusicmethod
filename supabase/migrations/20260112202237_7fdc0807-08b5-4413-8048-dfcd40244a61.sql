-- Fix the function with proper variable naming to avoid ambiguity
DROP FUNCTION IF EXISTS public.repair_profile_tags_from_csv(jsonb);

CREATE OR REPLACE FUNCTION public.repair_profile_tags_from_csv(csv_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data JSONB;
  csv_email TEXT;
  csv_tags_raw TEXT;
  p_id UUID;
  t_name TEXT;
  t_id UUID;
  normalized_tags TEXT[];
  valid_t_ids UUID[];
  valid_t_names TEXT[];
  matched_count INT := 0;
  updated_count INT := 0;
  user_tags_created INT := 0;
  unmatched_emails TEXT[] := ARRAY[]::TEXT[];
  i INT;
BEGIN
  -- Process each row in the CSV data
  FOR row_data IN SELECT * FROM jsonb_array_elements(csv_data)
  LOOP
    -- Extract email and tags from the row
    csv_email := lower(btrim(row_data->>'email'));
    csv_tags_raw := row_data->>'tags';
    
    -- Skip if no email
    IF csv_email IS NULL OR csv_email = '' THEN
      CONTINUE;
    END IF;
    
    -- Find matching profile by email (case-insensitive)
    SELECT id INTO p_id
    FROM profiles
    WHERE lower(btrim(email)) = csv_email
    LIMIT 1;
    
    IF p_id IS NULL THEN
      unmatched_emails := array_append(unmatched_emails, csv_email);
      CONTINUE;
    END IF;
    
    matched_count := matched_count + 1;
    
    -- Parse and normalize the tags string
    normalized_tags := ARRAY[]::TEXT[];
    valid_t_ids := ARRAY[]::UUID[];
    valid_t_names := ARRAY[]::TEXT[];
    
    IF csv_tags_raw IS NOT NULL AND csv_tags_raw != '' THEN
      -- Split by comma and process each tag
      FOREACH t_name IN ARRAY string_to_array(csv_tags_raw, ',')
      LOOP
        -- Normalize: trim whitespace and remove surrounding quotes
        t_name := btrim(t_name);
        t_name := btrim(t_name, '"');
        t_name := btrim(t_name, '''');
        t_name := btrim(t_name);
        
        -- Skip empty tags
        IF t_name = '' THEN
          CONTINUE;
        END IF;
        
        -- Look up this tag in email_tags (case-insensitive match)
        SELECT et.id, et.name INTO t_id, t_name
        FROM email_tags et
        WHERE lower(et.name) = lower(t_name)
        LIMIT 1;
        
        IF t_id IS NOT NULL THEN
          -- Only add if not already in arrays
          IF NOT t_id = ANY(valid_t_ids) THEN
            valid_t_ids := array_append(valid_t_ids, t_id);
            valid_t_names := array_append(valid_t_names, t_name);
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Delete existing user_tags for this profile
    DELETE FROM user_tags WHERE user_id = p_id;
    
    -- Insert new user_tags
    IF array_length(valid_t_ids, 1) > 0 THEN
      FOR i IN 1..array_length(valid_t_ids, 1)
      LOOP
        INSERT INTO user_tags (user_id, email, tag_id, source)
        VALUES (p_id, csv_email, valid_t_ids[i], 'csv_import')
        ON CONFLICT (user_id, tag_id) DO NOTHING;
        user_tags_created := user_tags_created + 1;
      END LOOP;
    END IF;
    
    -- Update profiles.tags with the normalized tag names
    UPDATE profiles
    SET tags = valid_t_names
    WHERE id = p_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'matched_profiles', matched_count,
    'updated_profiles', updated_count,
    'user_tags_created', user_tags_created,
    'unmatched_count', array_length(unmatched_emails, 1),
    'sample_unmatched', unmatched_emails[1:10]
  );
END;
$$;