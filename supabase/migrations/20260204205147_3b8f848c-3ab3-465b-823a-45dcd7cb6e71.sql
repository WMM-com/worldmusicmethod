-- Drop the existing cron job with hardcoded key
SELECT cron.unschedule('process-scheduled-campaigns');

-- Recreate the cron job using dynamic configuration
-- Supabase provides anon key via current_setting('supabase.anon_key')
-- and the URL via current_setting('supabase.url')
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('supabase.url', true) || '/functions/v1/process-scheduled-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);