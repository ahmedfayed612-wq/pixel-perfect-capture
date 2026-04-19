import { Link, Outlet, createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Timer, BookOpen, Calendar, BarChart3, Flame, Gift, Settings, LogOut, Lock } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { tr, t } from "@/i18n/strings";
import { Logo } from "@/components/brand/Logo";
import { LangToggle } from "@/components/brand/LangToggle";

export const Route = createFileRoute("/app")({ component: AppLayout });

const navItems = [
  { to: "/app", icon: Home, label: t.nav.dashboard, exact: true, pro: false },
  { to: "/app/timer", icon: Timer, label: t.nav.timer, pro: false },
  { to: "/app/subjects", icon: BookOpen, label: t.nav.subjects, pro: false },
  { to: "/app/schedule", icon: Calendar, label: t.nav.schedule, pro: true },
  { to: "/app/analytics", icon: BarChart3, label: t.nav.analytics, pro: true },
  { to: "/app/streaks", icon: Flame, label: t.nav.streaks, pro: false },
  { to: "/app/invite", icon: Gift, label: t.nav.invite, pro: false },
] as const;

function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile && !profile.onboarding_complete) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-off-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden bg-teal-dark md:flex md:flex-col md:px-4 md:py-6">
        <div className="px-2 pb-6">
          <Logo size="sm" onDark />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active =
              "exact" in item && item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            const locked = item.pro && !profile?.is_pro;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white text-teal" : "text-white/85 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tr(item.label, lang)}</span>
                {locked && <Lock className="ms-auto h-3 w-3 text-gold" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <div className="px-3 text-xs text-white/70">{profile?.name}</div>
          <div className="px-3">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                profile?.is_pro ? "bg-gold text-teal-dark" : "bg-white/10 text-white/80"
              }`}
            >
              {profile?.is_pro ? "PRO" : "FREE"}
            </span>
          </div>
          <Link
            to="/app/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
            <span>{tr(t.nav.settings, lang)}</span>
          </Link>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{tr(t.nav.logout, lang)}</span>
          </button>
          <div className="px-3 pt-2">
            <LangToggle onDark />
          </div>
        </div>
      </aside>

      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-light-grey bg-white md:hidden">
        {[
          { to: "/app", icon: Home, label: t.nav.dashboard, exact: true },
          { to: "/app/timer", icon: Timer, label: t.nav.timer },
          { to: "/app/subjects", icon: BookOpen, label: t.nav.subjects },
          { to: "/app/streaks", icon: Flame, label: t.nav.streaks },
          { to: "/app/settings", icon: Settings, label: t.nav.settings },
        ].map((item) => {
          const active =
            "exact" in item && item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${
                active ? "text-teal" : "text-mid-grey"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tr(item.label, lang)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
