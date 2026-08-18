DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-poll-every-3min') THEN
    PERFORM cron.unschedule('instagram-poll-every-3min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-poll-every-10min') THEN
    PERFORM cron.unschedule('instagram-poll-every-10min');
  END IF;
END $$;

SELECT cron.schedule(
  'instagram-poll-every-3min',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lvrbhgulxqdsamhdjzkw.supabase.co/functions/v1/instagram-poll',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cmJoZ3VseHFkc2FtaGRqemt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDYyNDIsImV4cCI6MjA5NjgyMjI0Mn0._I4OukQ6LlNmTxvPp2yvPat-jiYxOaCEZXGxRl9NqeM"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);