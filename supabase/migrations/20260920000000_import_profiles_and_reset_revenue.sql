-- Import profiles from CSV and reset all revenue to 0
-- This migration will:
-- 1. Clear all payments and subscriptions to reset revenue
-- 2. Import the provided profiles
-- 3. Ensure all revenue-related fields are 0

-- Step 1: Clear all payments to reset revenue
DELETE FROM public.payments;

-- Step 2: Clear all subscriptions to reset revenue
DELETE FROM public.subscriptions;

-- Step 3: Clear any revenue-related data from profiles
UPDATE public.profiles 
SET 
  referral_credits_egp = 0,
  subscription_start = NULL,
  subscription_end = NULL;

-- Step 4: Import the provided profiles
-- Clear existing profiles first to avoid conflicts
DELETE FROM public.profiles;

-- Insert the profiles from the CSV
INSERT INTO public.profiles (
  id,
  name,
  email,
  language,
  student_type,
  is_pro,
  subscription_start,
  subscription_end,
  referral_code,
  referral_credits_egp,
  referred_by_user_id,
  daily_goal_hours,
  onboarding_complete,
  created_at,
  dream_college,
  weekly_goal_hours,
  pomodoro_focus_min,
  pomodoro_short_break_min,
  pomodoro_long_break_min,
  pomodoro_rounds,
  notify_streak_risk,
  notify_daily_reminder,
  notify_weekly_summary,
  notify_block_reminder,
  plan,
  pro_expires_at
) VALUES
('2d6b0e4a-6123-49b5-9239-28d79f16ecd9', 'كريم مصطفي عوف حسن', 'kareemouf@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-USER422', 0, NULL, 3, true, '2026-09-04 13:55:57.507888+00', 'كلية حقوق', 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 'ahmed fayed', 'ahmedfayed612@gmail.com', 'en', 'highschool', true, '2026-09-04', '2027-05-02', 'WAQTI-AHMED352', 0, NULL, 5, true, '2026-04-19 15:43:44.249322+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'pro', '2027-05-02 12:01:35.898677+00'),
('bcb71681-e731-44c0-bc20-17e209802192', 'Ahmed fayed', 'ziadmofayed1@icloud.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-AHMED594', 0, NULL, 4, true, '2026-09-15 14:55:44.307669+00', 'الهندسه', 25, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('b67bad86-5a8e-4c3e-a14a-818beafe6019', 'Ziad fayed', 'ziadf9099@gmail.com', 'ar', 'highschool', true, NULL, NULL, 'WAQTI-ZIAD613', 0, 'e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 1, true, '2026-04-19 21:50:56.582746+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('4c8de896-2437-4609-a1c3-669a69e6eb6f', 'Youssef Ahmed Salem', 'ysalem76200676@gmail.com', 'ar', 'university', true, NULL, NULL, 'WAQTI-YOUSSEF735', 0, NULL, 2, true, '2026-04-20 10:57:52.337275+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('39a8412f-caac-45b4-92ff-194015b3c345', 'omar Mohamed', 'halalbusinessss@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-OMAR762', 0, NULL, 10, true, '2026-04-20 11:45:04.74936+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('2d253f15-b343-4337-a4d2-44e0d6295739', 'Nour Mahmoud fawzy', 'nouraldenmahmoud200@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-NOUR664', 0, NULL, 4, false, '2026-04-20 17:23:39.605825+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('d4207e98-9385-4c6a-ac4c-139168b277b5', 'Maya walid', 'walidwillo2005@gmail.com', 'ar', 'university', true, NULL, NULL, 'WAQTI-MAYA772', 0, 'e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 4, true, '2026-04-19 20:27:10.274825+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('e428c16a-f288-43e2-860d-f9bcc538bfb7', 'Ahmed Fayedd', 'ahmedfayed66o@gmail.com', 'ar', 'highschool', true, '2026-09-17', '2026-10-17', 'WAQTI-AHMED222', 0, NULL, 3, true, '2026-09-01 11:43:59.470397+00', 'طب', 20, 25, 5, 15, 4, true, true, true, true, 'pro', '2026-10-17 19:30:00+00'),
('2c4ef3f4-bbe2-4c43-bffc-c5ad89d9c08c', 'IBBO', 'bbode6786@gmail.com', 'en', 'highschool', true, NULL, NULL, 'WAQTI-IBBO233', 0, NULL, 10, true, '2026-04-21 11:05:40.444134+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('463e6836-74ea-407e-9e5c-a32b2ccb185c', 'Saad Mohamed', 'runs71151@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-SAAD693', 0, NULL, 4, true, '2026-04-22 17:13:32.692355+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('2b005d37-a92b-4899-83cb-f1c02314b7ad', 'ملك محمد عربي', 'marabe581@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-USER883', 0, NULL, 4, true, '2026-09-17 20:53:28.696752+00', 'طب أسنان', 30, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('28c2af35-2b9f-4311-9513-2b74cadeddc0', 'Youssef ahmed', 'youssef.158713@gmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-YOUSSEF109', 0, NULL, 1, true, '2026-05-24 19:07:51.703626+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('8f44ca9a-b48d-4ed7-92cb-ab71e03e0fb4', 'Sara diaa', 'sara_diaa_sabah@icloud.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-SARA492', 0, NULL, 4, false, '2026-06-12 03:33:05.715212+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('016b410f-144d-4b49-919e-f8b392edfde1', 'حبيبه سامي السيد الكراف', 'haneenelkaraf@gmail.com', 'ar', 'university', false, NULL, NULL, 'WAQTI-USER132', 0, NULL, 4, false, '2026-08-02 22:34:38.698237+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('80976fc4-ea57-4400-9372-4e2eb403e130', 'Ahmed Fayed Test', 'ahmedfayed612+1@gmail.com', 'ar', 'university', false, NULL, NULL, 'WAQTI-AHMED581', 0, NULL, 4, false, '2026-08-21 16:01:29.907738+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('e56780c8-9245-4966-8183-73ac33995c56', 'Noha reda', 'redanoha380@gmail.com', 'ar', 'university', false, '2026-08-04', '2026-09-04', 'WAQTI-NOHA853', 0, NULL, 3, true, '2026-09-04 14:29:55.446145+00', 'طب اسنان', 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('d9a295a8-3366-4160-b097-8786539aaa74', 'QA Test User 20260821', 'ahmedfayed612+waqti20260821@gmail.com', 'en', 'highschool', false, NULL, NULL, 'WAQTI-QA938', 0, NULL, 4, false, '2026-08-21 16:02:33.952583+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('facc7b0a-317d-490f-a85d-c28dc8fb6029', 'كريم مصطفي عوف', 'kareemouf18@gmail.com', 'ar', 'university', false, NULL, NULL, 'WAQTI-USER806', 0, 'e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 1, true, '2026-04-19 18:52:42.367757+00', NULL, 20, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('106b03a5-3370-4c04-a617-1cce1fa15734', 'أحمد فهيم رجب', 'ahmed.fahim90@hotmail.com', 'ar', 'highschool', false, NULL, NULL, 'WAQTI-USER515', 0, NULL, 1, true, '2026-09-07 20:24:51.627265+00', 'الهندسة', 10, 25, 5, 15, 4, true, true, true, true, 'free', NULL),
('ef3af04a-6b41-4498-86fc-caf358b0c33d', 'Kermina Rafik', 'kerminarafik3@gmail.com', 'ar', 'highschool', true, '2026-09-04', '2027-09-03', 'WAQTI-KERMINA477', 0, NULL, 6, true, '2026-09-05 21:11:28.527086+00', 'اللي يجيبه ربنا', 45, 25, 5, 15, 4, true, true, true, true, 'pro', NULL);

-- Step 5: Reset all referral credits to 0
UPDATE public.profiles SET referral_credits_egp = 0;

-- Step 6: Clear all referrals to reset referral system
DELETE FROM public.referrals;

-- Step 7: Recreate referral relationships based on the CSV data
INSERT INTO public.referrals (referrer_user_id, referred_user_id, status, created_at)
VALUES
('e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 'b67bad86-5a8e-4c3e-a14a-818beafe6019', 'pending', '2026-04-19 21:50:56.582746+00'),
('e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 'd4207e98-9385-4c6a-ac4c-139168b277b5', 'pending', '2026-04-19 20:27:10.274825+00'),
('e9cc4d7b-1a64-4f0d-9cd7-c64babcf88ba', 'facc7b0a-317d-490f-a85d-c28dc8fb6029', 'pending', '2026-04-19 18:52:42.367757+00');

-- Step 8: Clear any webhook logs
DELETE FROM public.webhook_logs;

-- Step 9: Reset admin audit log (optional - keep or clear as needed)
-- DELETE FROM public.admin_audit_log;

-- Add a comment to explain what this migration does
COMMENT ON COLUMN public.profiles.referral_credits_egp IS 'Reset to 0 for revenue reset migration';
COMMENT ON TABLE public.payments IS 'All payments cleared for revenue reset migration';
COMMENT ON TABLE public.subscriptions IS 'All subscriptions cleared for revenue reset migration';