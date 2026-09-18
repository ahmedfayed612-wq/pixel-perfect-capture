import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, BookOpen, Clock, TrendingUp, GraduationCap, Globe } from "lucide-react";
import { getUserAnalytics } from "@/lib/admin.server";

export const Route = createFileRoute("/dashboard-admin/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [daysFilter]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getUserAnalytics({ days: daysFilter });
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "teal" }: any) => (
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
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">Analytics</h1>
        <p className="mt-2 text-sm text-mid-grey">Detailed user and engagement metrics</p>
      </div>

      {/* Time Filter */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setDaysFilter(7)}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${
            daysFilter === 7 ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
          }`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => setDaysFilter(30)}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${
            daysFilter === 30 ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
          }`}
        >
          Last 30 days
        </button>
        <button
          onClick={() => setDaysFilter(90)}
          className={`px-4 py-2 text-sm font-medium rounded-lg ${
            daysFilter === 90 ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
          }`}
        >
          Last 90 days
        </button>
      </div>

      {/* User Demographics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">User Demographics</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Users"
            value={analytics?.total_users?.toLocaleString() || "0"}
            icon={Users}
            color="teal"
          />
          <StatCard
            title="New Users"
            value={analytics?.new_users?.toLocaleString() || "0"}
            icon={TrendingUp}
            color="gold"
          />
          <StatCard
            title="Pro Users"
            value={analytics?.pro_users?.toLocaleString() || "0"}
            icon={GraduationCap}
            color="teal"
          />
          <StatCard
            title="Active Users"
            value={analytics?.active_users?.toLocaleString() || "0"}
            icon={Clock}
            color="gold"
          />
        </div>
      </div>

      {/* Student Type Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Student Type Distribution</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="High School Students"
            value={analytics?.highschool_users?.toLocaleString() || "0"}
            icon={BookOpen}
            color="teal"
          />
          <StatCard
            title="University Students"
            value={analytics?.university_users?.toLocaleString() || "0"}
            icon={GraduationCap}
            color="gold"
          />
        </div>
      </div>

      {/* Language Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Language Distribution</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Arabic Users"
            value={analytics?.arabic_users?.toLocaleString() || "0"}
            icon={Globe}
            color="teal"
          />
          <StatCard
            title="English Users"
            value={analytics?.english_users?.toLocaleString() || "0"}
            icon={Globe}
            color="gold"
          />
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Engagement Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Total Study Hours"
            value={`${analytics?.total_study_hours?.toFixed(1) || "0"}h`}
            icon={Clock}
            color="teal"
          />
          <StatCard
            title="Avg Hours per User"
            value={`${analytics?.avg_study_hours_per_user?.toFixed(1) || "0"}h`}
            icon={TrendingUp}
            color="gold"
          />
        </div>
      </div>

      {/* Engagement Rate */}
      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold text-near-black mb-4">Engagement Rate</h2>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-teal">
            {analytics?.active_users && analytics?.total_users 
              ? ((analytics.active_users / analytics.total_users) * 100).toFixed(1)
              : "0"}%
          </div>
          <div className="text-sm text-mid-grey">
            of users are active (studied in the selected period)
          </div>
        </div>
      </div>
    </div>
  );
}
