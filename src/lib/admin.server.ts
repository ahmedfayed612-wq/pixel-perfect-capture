// Admin dashboard functions using direct Supabase calls
import { supabase } from "@/integrations/supabase/client";

// Get dashboard metrics
export const getDashboardMetrics = async () => {
  try {
    const [
      totalUsersResult,
      proUsersResult,
      paymentsData,
      todaySignupsResult,
      todayActiveResult,
      referralsData,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
      supabase.from("payments").select("amount"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", new Date().toISOString().split('T')[0]),
      supabase.from("sessions").select("user_id", { count: "exact", head: true }).eq("date", new Date().toISOString().split('T')[0]),
      supabase.from("referrals").select("*", { count: "exact", head: true }),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const proUsers = proUsersResult.count || 0;
    const totalRevenue = (paymentsData.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentPayments } = await supabase
      .from("payments")
      .select("amount")
      .gte("created_at", thirtyDaysAgo.toISOString());
    
    const monthlyRevenue = (recentPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const totalReferrals = referralsData.count || 0;
    const convertedReferrals = (referralsData.data || []).filter((r: any) => r.status === "converted").length;

    return {
      total_users: totalUsers,
      pro_users: proUsers,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      signups_today: todaySignupsResult.count || 0,
      active_users_today: todayActiveResult.count || 0,
      referrals_total: totalReferrals,
      referrals_converted: convertedReferrals,
    };
  } catch (error) {
    console.error("Failed to get dashboard metrics:", error);
    throw error;
  }
};

// Get user analytics
export const getUserAnalytics = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalUsersResult,
      newUsersResult,
      proUsersResult,
      activeUsersResult,
      profilesData,
      sessionsData,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startDate.toISOString()),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("pro_expires_at", new Date().toISOString()),
      supabase.from("profiles").select("student_type, language"),
      supabase.from("sessions").select("hours").gte("date", startDate.toISOString()),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const newUsers = newUsersResult.count || 0;
    const proUsers = proUsersResult.count || 0;
    const activeUsers = activeUsersResult.count || 0;
    const profiles = profilesData.data || [];
    const sessions = sessionsData.data || [];
    
    const highschoolCount = profiles.filter((p: any) => p.student_type === "highschool").length;
    const universityCount = profiles.filter((p: any) => p.student_type === "university").length;
    const arabicCount = profiles.filter((p: any) => p.language === "ar").length;
    const englishCount = profiles.filter((p: any) => p.language === "en").length;
    
    const totalHours = sessions.reduce((sum: number, s: any) => sum + (s.hours || 0), 0);
    const avgHours = totalUsers ? totalHours / totalUsers : 0;

    return {
      total_users: totalUsers,
      new_users: newUsers,
      pro_users: proUsers,
      active_users: activeUsers,
      highschool_count: highschoolCount,
      university_count: universityCount,
      arabic_count: arabicCount,
      english_count: englishCount,
      total_hours: totalHours,
      avg_hours_per_user: avgHours,
    };
  } catch (error) {
    console.error("Failed to get user analytics:", error);
    throw error;
  }
};

// Get revenue summary
export const getRevenueSummary = async (days: number = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      allPayments,
      recentPayments,
      totalTransactionsResult,
    ] = await Promise.all([
      supabase.from("payments").select("amount, plan"),
      supabase.from("payments").select("amount, plan").gte("created_at", startDate.toISOString()),
      supabase.from("payments").select("*", { count: "exact", head: true }),
    ]);

    const totalRevenue = (allPayments.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const periodRevenue = (recentPayments.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const monthlyRevenue = (recentPayments.data || [])
      .filter((p: any) => p.plan === "monthly")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const nineMonthRevenue = (recentPayments.data || [])
      .filter((p: any) => p.plan === "nine_month")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const totalTransactions = totalTransactionsResult.count || 0;
    const avgTransaction = totalTransactions ? periodRevenue / totalTransactions : 0;

    return {
      total_revenue: totalRevenue,
      period_revenue: periodRevenue,
      total_transactions: totalTransactions,
      monthly_revenue: monthlyRevenue,
      nine_month_revenue: nineMonthRevenue,
      avg_transaction: avgTransaction,
    };
  } catch (error) {
    console.error("Failed to get revenue summary:", error);
    throw error;
  }
};

// Get referral stats
export const getReferralStats = async () => {
  try {
    const [
      totalReferralsResult,
      referralsData,
      referrersData,
    ] = await Promise.all([
      supabase.from("referrals").select("*", { count: "exact", head: true }),
      supabase.from("referrals").select("*"),
      supabase.from("profiles").select("id, name, email"),
    ]);

    const totalReferrals = totalReferralsResult.count || 0;
    const referrals = referralsData.data || [];
    const referrers = referrersData.data || [];
    
    const convertedReferrals = referrals.filter((r: any) => r.status === "converted").length;
    const pendingReferrals = referrals.filter((r: any) => r.status === "pending").length;
    
    // Calculate top referrers
    const referrerCounts = referrals.reduce((acc: any, r: any) => {
      if (r.referrer_id) {
        acc[r.referrer_id] = (acc[r.referrer_id] || 0) + 1;
      }
      return acc;
    }, {});
    
    const conversionCounts = referrals.reduce((acc: any, r: any) => {
      if (r.referrer_id && r.status === "converted") {
        acc[r.referrer_id] = (acc[r.referrer_id] || 0) + 1;
      }
      return acc;
    }, {});
    
    const topReferrers = Object.entries(referrerCounts)
      .map(([id, count]) => {
        const referrer = referrers.find((r: any) => r.id === id);
        return {
          id,
          name: referrer?.name || "Unknown",
          email: referrer?.email || "Unknown",
          referral_count: count,
          conversion_count: conversionCounts[id] || 0,
        };
      })
      .sort((a: any, b: any) => b.referral_count - a.referral_count)
      .slice(0, 10);

    return {
      total_referrals: totalReferrals,
      converted_referrals: convertedReferrals,
      pending_referrals: pendingReferrals,
      conversion_rate: totalReferrals ? (convertedReferrals / totalReferrals) * 100 : 0,
      top_referrers: topReferrers,
    };
  } catch (error) {
    console.error("Failed to get referral stats:", error);
    throw error;
  }
};

// Get user list with pagination
export const getUserList = async (params: {
  page?: number; 
  limit?: number; 
  search?: string;
  plan?: string;
}) => {
  try {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }

    if (params.plan) {
      query = query.eq("plan", params.plan);
    }

    const { data: users, error, count } = await query;
    
    if (error) throw new Error(`Failed to get user list: ${error.message}`);
    
    const total = count || 0;
    
    return {
      users: users || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Failed to get user list:", error);
    throw error;
  }
};

// Get user details
export const getUserDetails = async (userId: string) => {
  try {
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw new Error(`Failed to get user details: ${error.message}`);
    return user;
  } catch (error) {
    console.error("Failed to get user details:", error);
    throw error;
  }
};

// Admin Pro activation
export const adminGrantPro = async (params: {
  userId: string; 
  days: number; 
  reason: string;
  adminSessionId?: string;
}) => {
  try {
    const { userId, days, reason, adminSessionId } = params;
    
    // Calculate new expiry date
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("pro_expires_at")
      .eq("id", userId)
      .single();
    
    const currentExpiry = currentProfile?.pro_expires_at 
      ? new Date(currentProfile.pro_expires_at) 
      : new Date();
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
    newExpiry.setDate(newExpiry.getDate() + days);
    
    // Update profile
    const { data: result, error } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        pro_expires_at: newExpiry.toISOString(),
        subscription_start: currentProfile?.pro_expires_at ? undefined : new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to grant Pro: ${error.message}`);
    
    // Log to audit log (if table exists)
    try {
      await supabase.from("admin_audit_log").insert({
        action: "grant_pro",
        target_user_id: userId,
        details: { days, reason },
        admin_session_id: adminSessionId || null,
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }
    
    return result;
  } catch (error) {
    console.error("Failed to grant Pro:", error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (params: {
  userId: string; 
  updates: Record<string, unknown>;
}) => {
  try {
    const { userId, updates } = params;
    
    const { data: result, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user profile: ${error.message}`);
    return result;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
};
