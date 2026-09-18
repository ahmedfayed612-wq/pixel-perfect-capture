-- Admin audit log for founder dashboard actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb,
  admin_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to admin audit log" ON public.admin_audit_log;
CREATE POLICY "No client access to admin audit log"
ON public.admin_audit_log FOR SELECT TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'pro_users', (SELECT count(*) FROM public.profiles WHERE plan = 'pro' AND (pro_expires_at IS NULL OR pro_expires_at > now())),
    'total_revenue', COALESCE((SELECT sum(amount) FROM public.payments WHERE status IN ('matched','success','paid')), 0),
    'monthly_revenue', COALESCE((SELECT sum(amount) FROM public.payments WHERE status IN ('matched','success','paid') AND created_at > now() - interval '30 days'), 0),
    'signups_today', (SELECT count(*) FROM public.profiles WHERE created_at::date = current_date),
    'active_users_today', (SELECT count(DISTINCT user_id) FROM public.sessions WHERE date = current_date),
    'referrals_total', (SELECT count(*) FROM public.referrals),
    'referrals_converted', (SELECT count(*) FROM public.referrals WHERE status = 'converted')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_analytics(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at > now() - make_interval(days => _days)),
    'pro_users', (SELECT count(*) FROM public.profiles WHERE plan = 'pro' AND (pro_expires_at IS NULL OR pro_expires_at > now())),
    'active_users', (SELECT count(DISTINCT user_id) FROM public.sessions WHERE date > current_date - _days),
    'highschool_users', (SELECT count(*) FROM public.profiles WHERE student_type = 'highschool'),
    'university_users', (SELECT count(*) FROM public.profiles WHERE student_type = 'university'),
    'arabic_users', (SELECT count(*) FROM public.profiles WHERE language = 'ar'),
    'english_users', (SELECT count(*) FROM public.profiles WHERE language = 'en'),
    'total_study_hours', COALESCE((SELECT sum(duration_minutes)::numeric / 60 FROM public.sessions WHERE date > current_date - _days), 0),
    'avg_study_hours_per_user', COALESCE((
      SELECT (sum(duration_minutes)::numeric / 60) / NULLIF(count(DISTINCT user_id), 0)
      FROM public.sessions WHERE date > current_date - _days
    ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_summary(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH paid AS (
    SELECT * FROM public.payments WHERE status IN ('matched','success','paid')
  )
  SELECT jsonb_build_object(
    'total_revenue', COALESCE((SELECT sum(amount) FROM paid), 0),
    'period_revenue', COALESCE((SELECT sum(amount) FROM paid WHERE created_at > now() - make_interval(days => _days)), 0),
    'total_transactions', (SELECT count(*) FROM paid),
    'period_transactions', (SELECT count(*) FROM paid WHERE created_at > now() - make_interval(days => _days)),
    'monthly_plan_revenue', COALESCE((SELECT sum(amount) FROM paid WHERE plan = 'monthly' AND created_at > now() - make_interval(days => _days)), 0),
    'nine_month_plan_revenue', COALESCE((SELECT sum(amount) FROM paid WHERE plan = 'nine_month' AND created_at > now() - make_interval(days => _days)), 0),
    'avg_transaction_value', COALESCE((SELECT avg(amount) FROM paid WHERE created_at > now() - make_interval(days => _days)), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_referrals', (SELECT count(*) FROM public.referrals),
    'converted_referrals', (SELECT count(*) FROM public.referrals WHERE status = 'converted'),
    'pending_referrals', (SELECT count(*) FROM public.referrals WHERE status <> 'converted')
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_pro(_user_id uuid, _days integer, _reason text, _admin_session_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expiry text;
BEGIN
  _expiry := public.grant_pro(_user_id, _days);

  INSERT INTO public.admin_audit_log (action, target_user_id, details, admin_session_id)
  VALUES ('grant_pro', _user_id, jsonb_build_object('days', _days, 'reason', _reason, 'expires_at', _expiry), _admin_session_id);

  RETURN jsonb_build_object('ok', true, 'expires_at', _expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_metrics() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_analytics(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_revenue_summary(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_referral_stats() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_grant_pro(uuid, integer, text, text) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_analytics(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_revenue_summary(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_pro(uuid, integer, text, text) TO service_role;