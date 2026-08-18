CREATE OR REPLACE FUNCTION public.get_engagement_orders_page(
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0,
  _search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH base AS (
  SELECT o.*
  FROM public.engagement_orders o
  WHERE o.user_id = auth.uid()
    AND (
      COALESCE(btrim(_search), '') = ''
      OR o.order_number::text LIKE '%' || btrim(_search) || '%'
      OR o.link ILIKE '%' || btrim(_search) || '%'
      OR COALESCE(o.campaign_name, '') ILIKE '%' || btrim(_search) || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(_offset, 0), 0)
),
item_stats AS (
  SELECT
    i.id,
    i.engagement_order_id,
    i.engagement_type,
    i.quantity,
    count(r.id) AS total_runs,
    count(r.id) FILTER (WHERE r.status = 'completed') AS completed_runs,
    count(r.id) FILTER (WHERE r.status = 'pending') AS pending_runs,
    count(r.id) FILTER (WHERE r.status IN ('started', 'processing')) AS active_runs,
    min(r.scheduled_at) FILTER (WHERE r.status = 'pending') AS next_run_at,
    COALESCE(SUM(
      CASE
        WHEN lower(COALESCE(r.provider_status, '')) IN ('completed', 'complete') THEN r.quantity_to_send
        WHEN r.provider_remains IS NOT NULL THEN GREATEST(0, r.quantity_to_send - r.provider_remains)
        WHEN r.status = 'completed' THEN r.quantity_to_send
        ELSE 0
      END
    ), 0)::bigint AS delivered
  FROM public.engagement_order_items i
  LEFT JOIN public.organic_run_schedule r ON r.engagement_order_item_id = i.id
  WHERE i.engagement_order_id IN (SELECT id FROM base)
  GROUP BY i.id, i.engagement_order_id, i.engagement_type, i.quantity
)
SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
FROM (
  SELECT
    b.id,
    b.order_number,
    b.status,
    b.total_price,
    b.link,
    b.base_quantity,
    b.created_at,
    b.updated_at,
    b.is_organic_mode,
    b.campaign_name,
    COALESCE(agg.total_runs, 0) AS total_runs,
    COALESCE(agg.completed_runs, 0) AS completed_runs,
    COALESCE(agg.pending_runs, 0) AS pending_runs,
    COALESCE(agg.active_runs, 0) AS active_runs,
    COALESCE(agg.delivered, 0) AS delivered,
    COALESCE(agg.total_quantity, 0) AS total_quantity,
    agg.next_run_at,
    COALESCE(agg.items, '[]'::jsonb) AS items
  FROM base b
  LEFT JOIN LATERAL (
    SELECT
      SUM(s.total_runs)::bigint AS total_runs,
      SUM(s.completed_runs)::bigint AS completed_runs,
      SUM(s.pending_runs)::bigint AS pending_runs,
      SUM(s.active_runs)::bigint AS active_runs,
      SUM(s.delivered)::bigint AS delivered,
      SUM(s.quantity)::bigint AS total_quantity,
      min(s.next_run_at) AS next_run_at,
      jsonb_agg(jsonb_build_object(
        'id', s.id,
        'engagement_type', s.engagement_type,
        'quantity', s.quantity,
        'delivered', s.delivered,
        'completed_runs', s.completed_runs,
        'total_runs', s.total_runs
      ) ORDER BY s.engagement_type) AS items
    FROM item_stats s
    WHERE s.engagement_order_id = b.id
  ) agg ON true
) x;
$$;

GRANT EXECUTE ON FUNCTION public.get_engagement_orders_page(integer, integer, text) TO authenticated;