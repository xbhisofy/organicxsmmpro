CREATE TABLE public.single_order_services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 service_id uuid NOT NULL UNIQUE REFERENCES public.services(id),
 provider_account_id uuid NOT NULL REFERENCES public.provider_accounts(id),
 provider_service_number text NOT NULL,
 provider_name text NOT NULL,
 name text NOT NULL,
 category text NOT NULL,
 platform text NOT NULL DEFAULT 'Other',
 price_per_k numeric NOT NULL DEFAULT 0,
 provider_rate_usd numeric NOT NULL DEFAULT 0,
 min_quantity integer NOT NULL DEFAULT 1,
 max_quantity integer NOT NULL DEFAULT 100000,
 description text,
 speed text,
 refill text,
 cancel_allowed text,
 quality text,
 drop_type text,
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_account_id, provider_service_number)
);
GRANT SELECT ON public.single_order_services TO authenticated;
GRANT ALL ON public.single_order_services TO service_role;
ALTER TABLE public.single_order_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read available single order services" ON public.single_order_services FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS single_order_service_id uuid REFERENCES public.single_order_services(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS single_order_request_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS single_order_provider_account_id uuid REFERENCES public.provider_accounts(id);
CREATE UNIQUE INDEX orders_single_request_unique ON public.orders(user_id, single_order_request_id) WHERE single_order_request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.create_single_order(p_user_id uuid, p_catalogue_id uuid, p_link text, p_quantity integer, p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.single_order_services; o public.orders; v_balance numeric; v_charge numeric;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'User and request are required'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(hashtextextended('single-order:' || p_user_id::text || p_request_id::text, 0));
 SELECT * INTO o FROM public.orders WHERE user_id = p_user_id AND single_order_request_id = p_request_id;
 IF FOUND THEN
  IF o.single_order_service_id IS DISTINCT FROM p_catalogue_id OR o.link IS DISTINCT FROM p_link OR o.quantity IS DISTINCT FROM p_quantity THEN RAISE EXCEPTION 'Request ID already used for another order'; END IF;
  RETURN jsonb_build_object('order_id',o.id,'order_number',o.order_number,'price',o.price,'status',o.status,'duplicate',true);
 END IF;
 SELECT * INTO c FROM public.single_order_services WHERE id = p_catalogue_id AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Service not available'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.provider_accounts WHERE id=c.provider_account_id AND is_active) THEN RAISE EXCEPTION 'Provider currently unavailable'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.services WHERE id=c.service_id AND is_active) THEN RAISE EXCEPTION 'Service not available'; END IF;
 IF p_quantity IS NULL OR p_quantity < c.min_quantity OR p_quantity > c.max_quantity THEN RAISE EXCEPTION 'Quantity must be between % and %',c.min_quantity,c.max_quantity; END IF;
 IF p_link IS NULL OR length(p_link)>2000 OR p_link !~ '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Valid public HTTP or HTTPS link required'; END IF;
 v_charge := round(p_quantity::numeric / 1000 * c.price_per_k, 6);
 IF v_charge <= 0 THEN RAISE EXCEPTION 'Service price is not configured'; END IF;
 SELECT balance INTO v_balance FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR coalesce(v_balance,0) < v_charge THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
 INSERT INTO public.orders(user_id,service_id,link,quantity,price,status,is_organic_mode,is_drip_feed,single_order_service_id,single_order_request_id,single_order_provider_account_id)
 VALUES(p_user_id,c.service_id,p_link,p_quantity,v_charge,'pending',false,false,c.id,p_request_id,c.provider_account_id) RETURNING * INTO o;
 UPDATE public.wallets SET balance=balance-v_charge,total_spent=coalesce(total_spent,0)+v_charge,updated_at=now() WHERE user_id=p_user_id;
 INSERT INTO public.transactions(user_id,type,amount,balance_after,order_id,description,payment_method,payment_reference,status)
 VALUES(p_user_id,'order_payment',v_charge,v_balance-v_charge,o.id,'Single Order #' || o.order_number || ' - ' || c.name,'wallet','single-order:' || p_request_id,'completed');
 RETURN jsonb_build_object('order_id',o.id,'order_number',o.order_number,'price',v_charge,'new_balance',v_balance-v_charge,'status',o.status,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.create_single_order(uuid,uuid,text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_single_order(uuid,uuid,text,integer,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.refund_rejected_single_order(p_order_id uuid, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; v_balance numeric;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND single_order_service_id IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR o.status NOT IN ('pending','processing') OR o.provider_order_id IS NOT NULL THEN RETURN; END IF;
 SELECT balance INTO v_balance FROM public.wallets WHERE user_id=o.user_id FOR UPDATE;
 UPDATE public.orders SET status='failed',error_message=left(p_reason,500),updated_at=now() WHERE id=o.id;
 UPDATE public.wallets SET balance=balance+o.price,total_spent=greatest(0,coalesce(total_spent,0)-o.price),updated_at=now() WHERE user_id=o.user_id;
 INSERT INTO public.transactions(user_id,type,amount,balance_after,order_id,description,payment_method,payment_reference,status)
 VALUES(o.user_id,'refund',o.price,v_balance+o.price,o.id,'Single Order #' || o.order_number || ' rejected: refunded','wallet','single-refund:' || o.id,'completed');
END $$;
REVOKE ALL ON FUNCTION public.refund_rejected_single_order(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_rejected_single_order(uuid,text) TO service_role;