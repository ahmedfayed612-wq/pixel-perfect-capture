REVOKE ALL ON FUNCTION public.expire_pro_if_due() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.expire_pro_if_due() TO authenticated, service_role;