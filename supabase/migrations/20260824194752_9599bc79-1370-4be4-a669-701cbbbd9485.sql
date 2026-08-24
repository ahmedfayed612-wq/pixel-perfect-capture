CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('monthly','nine_month')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','expired','pending','failed')),
  kashier_order_id text UNIQUE,
  amount_paid numeric NOT NULL DEFAULT 0,
  expiry_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscriptions: users view own" ON public.subscriptions;
CREATE POLICY "Subscriptions: users view own" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_order_idx ON public.subscriptions(kashier_order_id);