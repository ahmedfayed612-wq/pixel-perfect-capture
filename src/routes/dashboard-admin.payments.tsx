import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";
import { getRevenueSummary } from "@/lib/admin.server";

export const Route = createFileRoute("/dashboard-admin/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    loadRevenue();
  }, [daysFilter]);

  const loadRevenue = async () => {
    setLoading(true);
    try {
      const data = await getRevenueSummary(daysFilter);
      setRevenue(data);
    } catch (error) {
      console.error("Failed to load revenue data:", error);
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
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">Payments & Revenue</h1>
        <p className="mt-2 text-sm text-mid-grey">Track revenue and payment history</p>
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

      {/* Revenue Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Revenue Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`EGP ${revenue?.total_revenue?.toLocaleString() || "0"}`}
            icon={DollarSign}
            color="teal"
          />
          <StatCard
            title={`Last ${daysFilter} Days`}
            value={`EGP ${revenue?.period_revenue?.toLocaleString() || "0"}`}
            icon={TrendingUp}
            color="gold"
          />
          <StatCard
            title="Total Transactions"
            value={revenue?.total_transactions?.toLocaleString() || "0"}
            icon={CreditCard}
            color="teal"
          />
          <StatCard
            title={`Period Transactions`}
            value={revenue?.period_transactions?.toLocaleString() || "0"}
            icon={AlertCircle}
            color="gold"
          />
        </div>
      </div>

      {/* Plan Breakdown */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Revenue by Plan</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Monthly Plan Revenue"
            value={`EGP ${revenue?.monthly_plan_revenue?.toLocaleString() || "0"}`}
            icon={DollarSign}
            color="teal"
          />
          <StatCard
            title="9-Month Plan Revenue"
            value={`EGP ${revenue?.nine_month_plan_revenue?.toLocaleString() || "0"}`}
            icon={TrendingUp}
            color="gold"
          />
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold text-near-black mb-4">Financial Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-mid-grey">Average Transaction Value</div>
            <div className="mt-2 text-2xl font-bold text-near-black">
              {loading ? "..." : `EGP ${revenue?.avg_transaction_value?.toFixed(2) || "0"}`}
            </div>
          </div>
          <div>
            <div className="text-sm text-mid-grey">Revenue Growth</div>
            <div className="mt-2 text-2xl font-bold text-teal">
              {loading ? "..." : "+0%"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
