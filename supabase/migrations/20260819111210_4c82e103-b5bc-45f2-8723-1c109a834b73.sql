
CREATE OR REPLACE FUNCTION public.expire_pro_if_due()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET is_pro = false,
         plan = 'free'
   WHERE id = auth.uid()
     AND is_pro = true
     AND subscription_end IS NOT NULL
     AND subscription_end < (now() AT TIME ZONE 'Africa/Cairo')::date;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_pro_if_due() TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_all_pro_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.profiles
     SET is_pro = false,
         plan = 'free'
   WHERE is_pro = true
     AND subscription_end IS NOT NULL
     AND subscription_end < (now() AT TIME ZONE 'Africa/Cairo')::date;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_all_pro_subscriptions() FROM public;
REVOKE ALL ON FUNCTION public.expire_all_pro_subscriptions() FROM anon;
REVOKE ALL ON FUNCTION public.expire_all_pro_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_all_pro_subscriptions() TO service_role;

CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_pro IS DISTINCT FROM OLD.is_pro AND NEW.is_pro = true THEN
    RAISE EXCEPTION 'Pro status cannot be changed from the client';
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan AND NEW.plan <> 'free' THEN
    RAISE EXCEPTION 'Plan cannot be changed from the client';
  END IF;

  IF NEW.subscription_start IS DISTINCT FROM OLD.subscription_start
     OR NEW.subscription_end IS DISTINCT FROM OLD.subscription_end THEN
    RAISE EXCEPTION 'Subscription dates cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_fields_trg ON public.profiles;
CREATE TRIGGER protect_subscription_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();
