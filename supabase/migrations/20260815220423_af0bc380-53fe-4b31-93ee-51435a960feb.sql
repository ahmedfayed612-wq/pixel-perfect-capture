REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN ('update_updated_at_column','handle_new_user','handle_session_streak','update_streak_on_session','generate_referral_code')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', f.sig);
  END LOOP;
END $$;