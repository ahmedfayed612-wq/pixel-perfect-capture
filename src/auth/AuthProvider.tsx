import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  name: string;
  email: string;
  language: "ar" | "en";
  student_type: "highschool" | "university" | null;
  is_pro: boolean;
  subscription_start: string | null;
  subscription_end: string | null;
  pro_expires_at: string | null;
  referral_code: string | null;
  referral_credits_egp: number;
  referred_by_user_id: string | null;
  daily_goal_hours: number;
  weekly_goal_hours: number;
  dream_college: string | null;
  pomodoro_focus_min: number;
  pomodoro_short_break_min: number;
  pomodoro_long_break_min: number;
  pomodoro_rounds: number;
  notify_streak_risk: boolean;
  notify_daily_reminder: boolean;
  notify_weekly_summary: boolean;
  notify_block_reminder: boolean;
  plan: string;
  onboarding_complete: boolean;
};

type Ctx = {
  user: User | null;
  /** Single source of truth for Pro access: plan === "pro" AND pro_expires_at in the future. */
  isPro: boolean;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    // Server-side enforcement: downgrade to Free if the Pro period has ended.
    try {
      await supabase.rpc("expire_pro_if_due");
    } catch {
      /* non-fatal */
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  };

  useEffect(() => {
    // Subscribe FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // Then load existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isPro =
    !!profile &&
    profile.plan === "pro" &&
    !!profile.pro_expires_at &&
    new Date(profile.pro_expires_at).getTime() > Date.now();

  const value: Ctx = {
    user,
    isPro,
    session,
    profile,
    loading,
    refresh: async () => {
      if (user) await loadProfile(user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export type { Profile };
