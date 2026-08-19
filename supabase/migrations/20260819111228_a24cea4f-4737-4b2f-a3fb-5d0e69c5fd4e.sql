
REVOKE ALL ON FUNCTION public.expire_pro_if_due() FROM public;
REVOKE ALL ON FUNCTION public.expire_pro_if_due() FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_pro_if_due() TO authenticated;
