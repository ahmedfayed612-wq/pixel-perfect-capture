import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gift, TrendingUp, Users, DollarSign, Crown } from "lucide-react";
import { getReferralStats } from "@/lib/admin.server";

export const Route = createFileRoute("/dashboard-admin/referrals")({ component: ReferralsPage });

function ReferralsPage() {
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    setLoading(true);
    try {
      const data = await getReferralStats();
      setReferralStats(data);
    } catch (error) {
      console.error("Failed to load referral stats:", error);
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
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">Referral Performance</h1>
        <p className="mt-2 text-sm text-mid-grey">Track referral program performance</p>
      </div>

      {/* Referral Overview */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Referral Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Referrals"
            value={referralStats?.total_referrals?.toLocaleString() || "0"}
            icon={Gift}
            color="teal"
          />
          <StatCard
            title="Converted Referrals"
            value={referralStats?.converted_referrals?.toLocaleString() || "0"}
            icon={Crown}
            color="gold"
          />
          <StatCard
            title="Pending Referrals"
            value={referralStats?.pending_referrals?.toLocaleString() || "0"}
            icon={Users}
            color="teal"
          />
          <StatCard
            title="Conversion Rate"
            value={`${referralStats?.conversion_rate?.toFixed(1) || "0"}%`}
            icon={TrendingUp}
            color="gold"
          />
        </div>
      </div>

      {/* Credits Impact */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Credits Impact</h2>
        <div className="surface-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="text-sm text-mid-grey">Total Credits Granted</div>
              <div className="mt-2 text-2xl font-bold text-near-black">
                {loading ? "..." : `${referralStats?.total_credits_granted?.toLocaleString() || "0"} EGP`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-near-black mb-4">Top Referrers</h2>
        <div className="surface-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-off-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Total Referrals</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Converted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-mid-grey">
                    Loading...
                  </td>
                </tr>
              ) : !referralStats?.top_referrers || referralStats.top_referrers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-mid-grey">
                    No referrers yet
                  </td>
                </tr>
              ) : (
                referralStats.top_referrers.map((referrer: any, index: number) => (
                  <tr key={index} className="border-b border-light-grey">
                    <td className="px-4 py-3 text-sm font-medium text-near-black">
                      {referrer.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-mid-grey">
                      {referrer.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-near-black">
                      {referrer.referral_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-near-black">
                      {referrer.converted_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
