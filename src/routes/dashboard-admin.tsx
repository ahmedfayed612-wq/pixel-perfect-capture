import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Users, DollarSign, Gift, BarChart3, LogOut, Shield } from "lucide-react";
import { isAdminAuthenticated, clearAdminSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/dashboard-admin")({ component: AdminLayout });

const navItems = [
  { to: "/dashboard-admin", icon: LayoutDashboard, label: "Overview", exact: true },
  { to: "/dashboard-admin/users", icon: Users, label: "Users" },
  { to: "/dashboard-admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/dashboard-admin/payments", icon: DollarSign, label: "Payments" },
  { to: "/dashboard-admin/referrals", icon: Gift, label: "Referrals" },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const isAuthenticated = isAdminAuthenticated();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/dashboard-admin/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-off-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal/30 border-t-teal" />
      </div>
    );
  }

  const handleLogout = () => {
    clearAdminSession();
    navigate({ to: "/dashboard-admin/login" });
  };

  return (
    <div className="min-h-screen bg-off-white md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden bg-teal-dark md:flex md:flex-col md:px-4 md:py-6">
        <div className="px-2 pb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal" />
            <span className="text-lg font-bold text-white">Founder Dashboard</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.to}
                href={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-light-grey bg-white md:hidden">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.to}
              href={item.to}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-mid-grey"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
