ALTER TABLE public.engagement_presets
  ADD COLUMN IF NOT EXISTS drip_percent_per_run integer NOT NULL DEFAULT 0;