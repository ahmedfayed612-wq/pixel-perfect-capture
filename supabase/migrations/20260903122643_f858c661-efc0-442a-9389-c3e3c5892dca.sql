-- 1. Pro expiry timestamp on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;
UPDATE public.profiles
  SET pro_expires_at = (subscription_end::timestamptz + interval '1 day')
  WHERE pro_expires_at IS NULL AND subscription_end IS NOT NULL;

-- 2. Payments ledger
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  plan text,
  status text NOT NULL DEFAULT 'matched',
  signup_email text,
  checkout_email text,
  checkout_phone text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. In-app notifications (renewal reminders)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe
  ON public.notifications (user_id, kind, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. Grant / extend Pro
CREATE OR REPLACE FUNCTION public.grant_pro(_user_id uuid, _days integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current timestamptz;
  _new timestamptz;
BEGIN
  SELECT pro_expires_at INTO _current FROM public.profiles WHERE id = _user_id;
  IF _current IS NULL OR _current <= now() THEN
    _new := now() + make_interval(days => _days);
  ELSE
    _new := _current + make_interval(days => _days);
  END IF;

  UPDATE public.profiles
    SET plan = 'pro',
        is_pro = true,
        pro_expires_at = _new,
        subscription_start = COALESCE(subscription_start, current_date),
        subscription_end = _new::date
    WHERE id = _user_id;

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_pro(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_pro(uuid, integer) TO service_role;

-- 5. Expiry (daily job + login-time call)
DROP FUNCTION IF EXISTS public.expire_pro_if_due();
CREATE OR REPLACE FUNCTION public.expire_pro_if_due()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
    SET plan = 'free', is_pro = false
    WHERE pro_expires_at IS NOT NULL
      AND pro_expires_at <= now()
      AND (plan = 'pro' OR is_pro = true);
$$;

GRANT EXECUTE ON FUNCTION public.expire_pro_if_due() TO authenticated, service_role;

-- 6. Renewal reminders (3 days out)
CREATE OR REPLACE FUNCTION public.send_pro_expiry_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, dedupe_key)
  SELECT p.id,
         'pro_expiry_reminder',
         'اشتراك Waqti Pro قرب يخلص',
         'باقي ' || GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p.pro_expires_at - now())) / 86400))::int
           || ' يوم على انتهاء اشتراكك. جدّد دلوقتي عشان متفقدش مزايا برو.',
         '/app/upgrade',
         to_char(now(), 'YYYY-MM-DD')
  FROM public.profiles p
  WHERE p.plan = 'pro'
    AND p.pro_expires_at > now()
    AND p.pro_expires_at <= now() + interval '3 days'
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.send_pro_expiry_reminders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_pro_expiry_reminders() TO service_role;

-- 7. Daily schedules
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('waqti-expire-pro') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'waqti-expire-pro');
SELECT cron.schedule('waqti-expire-pro', '5 0 * * *', $$SELECT public.expire_pro_if_due();$$);

SELECT cron.unschedule('waqti-pro-expiry-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'waqti-pro-expiry-reminders');
SELECT cron.schedule('waqti-pro-expiry-reminders', '15 6 * * *', $$SELECT public.send_pro_expiry_reminders();$$);