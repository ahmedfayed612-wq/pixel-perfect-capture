CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'kashier',
  verified boolean not null default false,
  note text,
  raw jsonb,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.webhook_logs TO service_role;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;