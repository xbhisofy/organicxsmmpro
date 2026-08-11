-- Stop infinite reschedule loops: permanently fail runs stuck in endless retries
UPDATE public.organic_run_schedule
SET status = 'failed',
    retry_count = 99,
    started_at = NULL,
    error_message = 'Stopped: infinite retry loop detected — ' || COALESCE(error_message, 'provider error')
WHERE status = 'pending'
  AND retry_count >= 30;

UPDATE public.organic_run_schedule
SET status = 'failed',
    retry_count = 99,
    started_at = NULL,
    error_message = 'Permanent provider error — ' || COALESCE(error_message, '')
WHERE status = 'pending'
  AND (
    lower(COALESCE(error_message, '')) LIKE '%less than minimal%'
    OR lower(COALESCE(error_message, '')) LIKE '%more than maximum%'
    OR lower(COALESCE(error_message, '')) LIKE '%incorrect link%'
    OR lower(COALESCE(error_message, '')) LIKE '%invalid link%'
    OR lower(COALESCE(error_message, '')) LIKE '%incorrect service%'
    OR lower(COALESCE(error_message, '')) LIKE '%no provider accounts configured%'
  );