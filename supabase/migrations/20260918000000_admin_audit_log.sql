-- Admin audit log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_session_id text,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grant access for service role (admin operations)
GRANT ALL ON public.admin_audit_log TO service_role;

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can interact with audit log
DROP POLICY IF EXISTS "Service role full access to admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "Service role full access to admin_audit_log" 
  ON public.admin_audit_log 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_idx ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_admin_session_idx ON public.admin_audit_log(admin_session_id);

-- Database function for getting dashboard metrics
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'pro_users', (SELECT COUNT(*) FROM profiles WHERE plan = 'pro'),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'matched'),
    'monthly_revenue', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE status = 'matched' 
      AND created_at >= NOW() - INTERVAL '30 days'
    ),
    'signups_today', (
      SELECT COUNT(*) 
      FROM profiles 
      WHERE DATE(created_at) = CURRENT_DATE
    ),
    'active_users_today', (
      SELECT COUNT(DISTINCT user_id) 
      FROM sessions 
      WHERE date = CURRENT_DATE
    ),
    'referrals_total', (SELECT COUNT(*) FROM referrals),
    'referrals_converted', (SELECT COUNT(*) FROM referrals WHERE status = 'converted')
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO service_role;

-- Database function for admin Pro activation with audit logging
CREATE OR REPLACE FUNCTION public.admin_grant_pro(_user_id uuid, _days integer, _reason text, _admin_session_id text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current timestamptz;
  _new timestamptz;
  _old_plan text;
  _old_pro_expires timestamptz;
BEGIN
  -- Get current state for audit
  SELECT plan, pro_expires_at INTO _old_plan, _old_pro_expires
  FROM public.profiles 
  WHERE id = _user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate new expiry
  IF _old_pro_expires IS NULL OR _old_pro_expires <= now() THEN
    _new := now() + make_interval(days => _days);
  ELSE
    _new := _old_pro_expires + make_interval(days => _days);
  END IF;

  -- Update profile
  UPDATE public.profiles
    SET plan = 'pro',
        is_pro = true,
        pro_expires_at = _new,
        subscription_start = COALESCE(subscription_start, current_date),
        subscription_end = _new::date
    WHERE id = _user_id;

  -- Log the action
  INSERT INTO public.admin_audit_log (admin_session_id, action, target_user_id, details)
  VALUES (
    _admin_session_id,
    'admin_grant_pro',
    _user_id,
    json_build_object(
      'days', _days,
      'reason', _reason,
      'old_plan', _old_plan,
      'old_pro_expires', _old_pro_expires,
      'new_pro_expires', _new
    )
  );

  RETURN _new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_pro(uuid, integer, text, text) TO service_role;

-- Database function for getting user analytics
CREATE OR REPLACE FUNCTION public.get_user_analytics(_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'new_users', (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - (_days || ' days')::interval),
    'pro_users', (SELECT COUNT(*) FROM profiles WHERE plan = 'pro'),
    'highschool_users', (SELECT COUNT(*) FROM profiles WHERE student_type = 'highschool'),
    'university_users', (SELECT COUNT(*) FROM profiles WHERE student_type = 'university'),
    'arabic_users', (SELECT COUNT(*) FROM profiles WHERE language = 'ar'),
    'english_users', (SELECT COUNT(*) FROM profiles WHERE language = 'en'),
    'active_users', (
      SELECT COUNT(DISTINCT user_id) 
      FROM sessions 
      WHERE date >= CURRENT_DATE - (_days || ' days')::interval
    ),
    'total_study_hours', (
      SELECT COALESCE(SUM(duration_minutes) / 60.0, 0) 
      FROM sessions 
      WHERE date >= CURRENT_DATE - (_days || ' days')::interval
    ),
    'avg_study_hours_per_user', (
      SELECT COALESCE(AVG(daily_hours), 0)
      FROM (
        SELECT user_id, SUM(duration_minutes) / 60.0 as daily_hours
        FROM sessions 
        WHERE date >= CURRENT_DATE - (_days || ' days')::interval
        GROUP BY user_id
      ) subquery
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_analytics(integer) TO service_role;

-- Database function for getting revenue summary
CREATE OR REPLACE FUNCTION public.get_revenue_summary(_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'matched'),
    'period_revenue', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE status = 'matched' 
      AND created_at >= NOW() - (_days || ' days')::interval
    ),
    'monthly_plan_revenue', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE status = 'matched' 
      AND plan = 'monthly'
      AND created_at >= NOW() - (_days || ' days')::interval
    ),
    'nine_month_plan_revenue', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE status = 'matched' 
      AND plan = 'nine_month'
      AND created_at >= NOW() - (_days || ' days')::interval
    ),
    'total_transactions', (SELECT COUNT(*) FROM payments WHERE status = 'matched'),
    'period_transactions', (
      SELECT COUNT(*) 
      FROM payments 
      WHERE status = 'matched' 
      AND created_at >= NOW() - (_days || ' days')::interval
    ),
    'avg_transaction_value', (
      SELECT COALESCE(AVG(amount), 0) 
      FROM payments 
      WHERE status = 'matched'
      AND created_at >= NOW() - (_days || ' days')::interval
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_summary(integer) TO service_role;

-- Database function for getting referral stats
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_referrals', (SELECT COUNT(*) FROM referrals),
    'converted_referrals', (SELECT COUNT(*) FROM referrals WHERE status = 'converted'),
    'pending_referrals', (SELECT COUNT(*) FROM referrals WHERE status = 'pending'),
    'conversion_rate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*) * 100), 2)
        ELSE 0 
      END
      FROM referrals
    ),
    'total_credits_granted', (SELECT COALESCE(SUM(referral_credits_egp), 0) FROM profiles),
    'top_referrers', (
      SELECT json_agg(json_build_object(
        'user_id', referrer_user_id,
        'name', p.name,
        'email', p.email,
        'referral_count', COUNT(*),
        'converted_count', COUNT(*) FILTER (WHERE status = 'converted')
      ))
      FROM referrals r
      JOIN profiles p ON r.referrer_user_id = p.id
      GROUP BY referrer_user_id, p.name, p.email
      ORDER BY COUNT(*) DESC
      LIMIT 10
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO service_role;
