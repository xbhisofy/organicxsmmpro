GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts TO authenticated;
GRANT ALL ON public.instagram_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_media TO authenticated;
GRANT ALL ON public.instagram_media TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_link_events TO authenticated;
GRANT ALL ON public.instagram_link_events TO service_role;
GRANT ALL ON public.instagram_poll_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_presets TO authenticated;
GRANT ALL ON public.engagement_presets TO service_role;