-- Referral conversion logic: when a referred user pays for Pro, convert the referral and give referrer credit

-- Function to convert referral and grant credit when a user becomes Pro
CREATE OR REPLACE FUNCTION public.convert_referral_and_grant_credit(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _referral_id uuid;
BEGIN
  -- Find the referral record for this user
  SELECT referrer_user_id, id INTO _referrer_id, _referral_id
  FROM public.referrals
  WHERE referred_user_id = _user_id
    AND status = 'pending'
  LIMIT 1;

  -- If no pending referral found, exit
  IF _referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Convert the referral status
  UPDATE public.referrals
    SET status = 'converted',
        converted_at = now()
  WHERE id = _referral_id;

  -- Grant 15 EGP credit to the referrer
  UPDATE public.profiles
    SET referral_credits_egp = referral_credits_egp + 15
  WHERE id = _referrer_id;

END;
$$;

REVOKE ALL ON FUNCTION public.convert_referral_and_grant_credit(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_referral_and_grant_credit(uuid) TO service_role;

-- Modify grant_pro function to automatically handle referral conversion
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

  -- Handle referral conversion after granting Pro
  PERFORM public.convert_referral_and_grant_credit(_user_id);

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_pro(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_pro(uuid, integer) TO service_role;
