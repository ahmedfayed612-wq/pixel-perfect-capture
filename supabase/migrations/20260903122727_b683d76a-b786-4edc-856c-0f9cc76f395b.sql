CREATE OR REPLACE FUNCTION public.find_user_for_payment(_signup_email text, _checkout_email text, _phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _digits text;
BEGIN
  IF _signup_email IS NOT NULL AND _signup_email <> '' THEN
    SELECT id INTO _id FROM public.profiles WHERE lower(trim(email)) = lower(trim(_signup_email)) LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
    SELECT id INTO _id FROM auth.users WHERE lower(trim(email)) = lower(trim(_signup_email)) LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
  END IF;

  IF _checkout_email IS NOT NULL AND _checkout_email <> '' THEN
    SELECT id INTO _id FROM public.profiles WHERE lower(trim(email)) = lower(trim(_checkout_email)) LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
    SELECT id INTO _id FROM auth.users WHERE lower(trim(email)) = lower(trim(_checkout_email)) LIMIT 1;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
  END IF;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    _digits := regexp_replace(_phone, '[^0-9]', '', 'g');
    -- keep the last 10 digits (drops country code / leading zero)
    IF length(_digits) > 10 THEN _digits := right(_digits, 10); END IF;
    IF length(_digits) >= 9 THEN
      SELECT id INTO _id FROM auth.users
        WHERE phone IS NOT NULL AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = _digits
        LIMIT 1;
      IF _id IS NOT NULL THEN RETURN _id; END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_for_payment(text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_for_payment(text, text, text) TO service_role;