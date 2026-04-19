-- Profiles linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  language text not null default 'ar' check (language in ('ar','en')),
  student_type text check (student_type in ('highschool','university')),
  is_pro boolean not null default false,
  subscription_start date,
  subscription_end date,
  referral_code text unique,
  referral_credits_egp integer not null default 0,
  referred_by_user_id uuid references public.profiles(id) on delete set null,
  daily_goal_hours integer not null default 4,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  name_ar text,
  color text not null,
  weekly_goal_hours integer not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index subjects_user_id_idx on public.subjects(user_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  duration_minutes integer not null check (duration_minutes > 0),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index sessions_user_date_idx on public.sessions(user_id, date desc);

create table public.schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);
create index schedule_user_idx on public.schedule(user_id);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_study_date date
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','converted')),
  created_at timestamptz not null default now(),
  converted_at timestamptz
);
create index referrals_referrer_idx on public.referrals(referrer_user_id);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.sessions enable row level security;
alter table public.schedule enable row level security;
alter table public.streaks enable row level security;
alter table public.referrals enable row level security;

create policy "Profiles: users can view own" on public.profiles for select using (auth.uid() = id);
create policy "Profiles: users can update own" on public.profiles for update using (auth.uid() = id);
create policy "Profiles: users can insert own" on public.profiles for insert with check (auth.uid() = id);

create policy "Subjects: select own" on public.subjects for select using (auth.uid() = user_id);
create policy "Subjects: insert own" on public.subjects for insert with check (auth.uid() = user_id);
create policy "Subjects: update own" on public.subjects for update using (auth.uid() = user_id);
create policy "Subjects: delete own" on public.subjects for delete using (auth.uid() = user_id);

create policy "Sessions: select own" on public.sessions for select using (auth.uid() = user_id);
create policy "Sessions: insert own" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Sessions: update own" on public.sessions for update using (auth.uid() = user_id);
create policy "Sessions: delete own" on public.sessions for delete using (auth.uid() = user_id);

create policy "Schedule: select own" on public.schedule for select using (auth.uid() = user_id);
create policy "Schedule: insert own" on public.schedule for insert with check (auth.uid() = user_id);
create policy "Schedule: update own" on public.schedule for update using (auth.uid() = user_id);
create policy "Schedule: delete own" on public.schedule for delete using (auth.uid() = user_id);

create policy "Streaks: select own" on public.streaks for select using (auth.uid() = user_id);
create policy "Streaks: insert own" on public.streaks for insert with check (auth.uid() = user_id);
create policy "Streaks: update own" on public.streaks for update using (auth.uid() = user_id);

create policy "Referrals: referrer can view" on public.referrals for select using (auth.uid() = referrer_user_id);
create policy "Referrals: referred can view" on public.referrals for select using (auth.uid() = referred_user_id);

create or replace function public.generate_referral_code(_name text)
returns text
language plpgsql
set search_path = public
as $$
declare
  base text;
  candidate text;
  attempts int := 0;
begin
  base := upper(regexp_replace(split_part(coalesce(_name,'USER'), ' ', 1), '[^A-Za-z]', '', 'g'));
  if base = '' then base := 'USER'; end if;
  loop
    candidate := 'WAQTI-' || base || lpad((floor(random()*900)+100)::int::text, 3, '0');
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
    attempts := attempts + 1;
    exit when attempts > 10;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_ref_code text;
  v_referred_by uuid;
  v_ref_input text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_ref_code := public.generate_referral_code(v_name);
  v_ref_input := new.raw_user_meta_data->>'ref';
  if v_ref_input is not null and length(v_ref_input) > 0 then
    select id into v_referred_by from public.profiles where referral_code = v_ref_input limit 1;
  end if;

  insert into public.profiles (id, name, email, language, student_type, referral_code, referred_by_user_id)
  values (
    new.id,
    v_name,
    new.email,
    coalesce(new.raw_user_meta_data->>'language', 'ar'),
    nullif(new.raw_user_meta_data->>'student_type', ''),
    v_ref_code,
    v_referred_by
  );

  insert into public.streaks (user_id) values (new.id);

  if v_referred_by is not null then
    insert into public.referrals (referrer_user_id, referred_user_id, referral_code)
    values (v_referred_by, new.id, v_ref_input);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_streak_on_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
begin
  select * into s from public.streaks where user_id = new.user_id;
  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_study_date)
    values (new.user_id, 1, 1, new.date);
    return new;
  end if;

  if s.last_study_date is null or s.last_study_date < new.date then
    if s.last_study_date = new.date - 1 then
      update public.streaks
        set current_streak = s.current_streak + 1,
            longest_streak = greatest(s.longest_streak, s.current_streak + 1),
            last_study_date = new.date
        where user_id = new.user_id;
    elsif s.last_study_date = new.date then
      null;
    else
      update public.streaks
        set current_streak = 1,
            longest_streak = greatest(s.longest_streak, 1),
            last_study_date = new.date
        where user_id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_session_inserted on public.sessions;
create trigger on_session_inserted
  after insert on public.sessions
  for each row execute function public.update_streak_on_session();