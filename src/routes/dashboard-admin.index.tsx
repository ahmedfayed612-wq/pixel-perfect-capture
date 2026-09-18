import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, DollarSign, TrendingUp, Clock, Gift, BarChart3, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard-admin/")({ component: AdminOverview });

function AdminOverview() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try direct Supabase calls instead of server functions
      const [
        { count: totalUsers },
        { count: proUsers },
        paymentsData,
        todaySignups,
        todayActive,
        referralsData,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
        supabase.from("payments").select("amount"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date().toISOString().split('T')[0]),
        supabase.from("sessions").select("user_id", { count: "exact", head: true }).eq("date", new Date().toISOString().split('T')[0]),
        supabase.from("referrals").select("*", { count: "exact", head: true }),
      ]);

      const totalRevenue = (paymentsData.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      // Calculate monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recentPayments } = await supabase
        .from("payments")
        .select("amount")
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      const monthlyRevenue = (recentPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const totalReferrals = referralsData || 0;
      const convertedReferrals = (referralsData.data || []).filter((r: any) => r.status === "converted").length;

      setMetrics({
        total_users: totalUsers || 0,
        pro_users: proUsers || 0,
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        signups_today: todaySignups || 0,
        active_users_today: todayActive || 0,
        referrals_total: totalReferrals,
        referrals_converted: convertedReferrals,
      });
    } catch (error) {
      console.error("Failed to load metrics:", error);
      setError("Failed to load dashboard metrics");
      // Set some default metrics for display
      setMetrics({
        total_users: 0,
        pro_users: 0,
        total_revenue: 0,
        monthly_revenue: 0,
        signups_today: 0,
        active_users_today: 0,
        referrals_total: 0,
        referrals_converted: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color = "teal" }: any) => (
    <div className="surface-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-mid-grey">{title}</div>
          <div className="mt-2 text-2xl font-bold text-near-black">
            {loading ? "..." : value}
          </div>
        </div>
        <div className={`h-10 w-10 rounded-full bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`h-5 w-5 text-${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">Dashboard Overview</h1>
        <p className="mt-2 text-sm text-mid-grey">Welcome back! Here's what's happening with Waqti.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title="Total Users"
          value={metrics?.total_users?.toLocaleString() || "0"}
          icon={Users}
          color="teal"
        />
        <MetricCard
          title="Pro Users"
          value={metrics?.pro_users?.toLocaleString() || "0"}
          icon={Shield}
          color="gold"
        />
        <MetricCard
          title="Total Revenue"
          value={`EGP ${metrics?.total_revenue?.toLocaleString() || "0"}`}
          icon={DollarSign}
          color="teal"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`EGP ${metrics?.monthly_revenue?.toLocaleString() || "0"}`}
          icon={TrendingUp}
          color="gold"
        />
        <MetricCard
          title="Signups Today"
          value={metrics?.signups_today?.toLocaleString() || "0"}
          icon={Users}
          color="teal"
        />
        <MetricCard
          title="Active Today"
          value={metrics?.active_users_today?.toLocaleString() || "0"}
          icon={Clock}
          color="gold"
        />
      </div>

      {/* Referral Stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Total Referrals"
          value={metrics?.referrals_total?.toLocaleString() || "0"}
          icon={Gift}
          color="teal"
        />
        <MetricCard
          title="Converted Referrals"
          value={metrics?.referrals_converted?.toLocaleString() || "0"}
          icon={TrendingUp}
          color="gold"
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-near-black">Quick Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <a
            href="/dashboard-admin/users"
            className="surface-card flex items-center gap-4 p-4 transition-colors hover:border-teal/40"
          >
            <div className="h-10 w-10 rounded-full bg-teal/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-teal" />
            </div>
            <div>
              <div className="font-medium text-near-black">Manage Users</div>
              <div className="text-sm text-mid-grey">View and manage user accounts</div>
            </div>
          </a>
          <a
            href="/dashboard-admin/analytics"
            className="surface-card flex items-center gap-4 p-4 transition-colors hover:border-teal/40"
          >
            <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="font-medium text-near-black">View Analytics</div>
              <div className="text-sm text-mid-grey">Detailed performance metrics</div>
            </div>
          </a>
          <a
            href="/dashboard-admin/referrals"
            className="surface-card flex items-center gap-4 p-4 transition-colors hover:border-teal/40"
          >
            <div className="h-10 w-10 rounded-full bg-teal/10 flex items-center justify-center">
              <Gift className="h-5 w-5 text-teal" />
            </div>
            <div>
              <div className="font-medium text-near-black">Referral Stats</div>
              <div className="text-sm text-mid-grey">Track referral performance</div>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-near-black">System Status</h2>
        <div className="mt-4 surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-near-black">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
