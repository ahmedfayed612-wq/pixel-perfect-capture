-- Add kind + title to schedule, allow subject_id to be null
ALTER TABLE public.schedule
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.schedule
  ALTER COLUMN subject_id DROP NOT NULL;

ALTER TABLE public.schedule
  DROP CONSTRAINT IF EXISTS schedule_kind_check;
ALTER TABLE public.schedule
  ADD CONSTRAINT schedule_kind_check CHECK (kind IN ('lecture','study','homework'));

CREATE INDEX IF NOT EXISTS schedule_user_day_idx ON public.schedule(user_id, day_of_week);