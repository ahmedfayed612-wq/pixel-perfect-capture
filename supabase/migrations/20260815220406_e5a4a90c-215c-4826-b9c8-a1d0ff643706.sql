ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dream_college text,
  ADD COLUMN IF NOT EXISTS weekly_goal_hours integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pomodoro_focus_min integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS pomodoro_short_break_min integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pomodoro_long_break_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS pomodoro_rounds integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS notify_streak_risk boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_daily_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_summary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_block_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS focus_score smallint,
  ADD COLUMN IF NOT EXISTS comprehension_score smallint,
  ADD COLUMN IF NOT EXISTS fatigue_score smallint,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS block_type text NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS schedule_block_id uuid REFERENCES public.schedule(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own badges" ON public.badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  target_days integer NOT NULL DEFAULT 5,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_challenges TO authenticated;
GRANT ALL ON public.weekly_challenges TO service_role;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own challenges" ON public.weekly_challenges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_weekly_challenges_updated_at
BEFORE UPDATE ON public.weekly_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();