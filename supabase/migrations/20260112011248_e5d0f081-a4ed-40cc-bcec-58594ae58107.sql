-- Create a cron job to process scheduled campaigns every minute
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bfwvjhrokucqjcbeufwk.supabase.co/functions/v1/process-scheduled-campaigns',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd3ZqaHJva3VjcWpjYmV1ZndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTI4MTEsImV4cCI6MjA4MTI4ODgxMX0.HURM7RONMIK04IDJLhcfzkfrda_yBh5RIDHB-iv3EMk"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);