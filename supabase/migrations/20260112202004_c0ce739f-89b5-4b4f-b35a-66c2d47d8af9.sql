-- Function to repair all profile tags from CSV data
-- This writes to BOTH user_tags (for admin UI) AND profiles.tags (for backend)
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
  profile_id UUID;
  tag_name TEXT;
  tag_id UUID;
  normalized_tags TEXT[];
  valid_tag_ids UUID[];
  valid_tag_names TEXT[];
  matched_count INT := 0;
  updated_count INT := 0;
  user_tags_created INT := 0;
  unmatched_emails TEXT[] := ARRAY[]::TEXT[];
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
    SELECT id INTO profile_id
    FROM profiles
    WHERE lower(btrim(email)) = csv_email
    LIMIT 1;
    
    IF profile_id IS NULL THEN
      unmatched_emails := array_append(unmatched_emails, csv_email);
      CONTINUE;
    END IF;
    
    matched_count := matched_count + 1;
    
    -- Parse and normalize the tags string
    -- Split by comma, trim each, remove quotes
    normalized_tags := ARRAY[]::TEXT[];
    valid_tag_ids := ARRAY[]::UUID[];
    valid_tag_names := ARRAY[]::TEXT[];
    
    IF csv_tags_raw IS NOT NULL AND csv_tags_raw != '' THEN
      -- Split by comma and process each tag
      FOREACH tag_name IN ARRAY string_to_array(csv_tags_raw, ',')
      LOOP
        -- Normalize: trim whitespace and remove surrounding quotes
        tag_name := btrim(tag_name);
        tag_name := btrim(tag_name, '"');
        tag_name := btrim(tag_name, '''');
        tag_name := btrim(tag_name);
        
        -- Skip empty tags
        IF tag_name = '' THEN
          CONTINUE;
        END IF;
        
        -- Look up this tag in email_tags (case-insensitive match)
        SELECT et.id, et.name INTO tag_id, tag_name
        FROM email_tags et
        WHERE lower(et.name) = lower(tag_name)
        LIMIT 1;
        
        IF tag_id IS NOT NULL THEN
          -- Only add if not already in arrays
          IF NOT tag_id = ANY(valid_tag_ids) THEN
            valid_tag_ids := array_append(valid_tag_ids, tag_id);
            valid_tag_names := array_append(valid_tag_names, tag_name);
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Delete existing user_tags for this profile
    DELETE FROM user_tags WHERE user_id = profile_id;
    
    -- Insert new user_tags
    IF array_length(valid_tag_ids, 1) > 0 THEN
      FOR i IN 1..array_length(valid_tag_ids, 1)
      LOOP
        INSERT INTO user_tags (user_id, email, tag_id, source)
        VALUES (profile_id, csv_email, valid_tag_ids[i], 'csv_import')
        ON CONFLICT (user_id, tag_id) DO NOTHING;
        user_tags_created := user_tags_created + 1;
      END LOOP;
    END IF;
    
    -- Update profiles.tags with the normalized tag names
    UPDATE profiles
    SET tags = valid_tag_names
    WHERE id = profile_id;
    
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