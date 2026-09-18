// Server functions for admin dashboard operations
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Get dashboard metrics
export const getDashboardMetrics = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.rpc("get_dashboard_metrics");
    if (error) throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    return data;
  });

// Get user analytics
export const getUserAnalytics = createServerFn({ method: "GET" })
  .inputValidator((input: { days?: number }) => ({
    days: typeof input.days === "number" ? input.days : 30,
  }))
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.rpc("get_user_analytics", { 
      _days: data.days 
    });
    if (error) throw new Error(`Failed to get user analytics: ${error.message}`);
    return result;
  });

// Get revenue summary
export const getRevenueSummary = createServerFn({ method: "GET" })
  .inputValidator((input: { days?: number }) => ({
    days: typeof input.days === "number" ? input.days : 30,
  }))
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.rpc("get_revenue_summary", { 
      _days: data.days 
    });
    if (error) throw new Error(`Failed to get revenue summary: ${error.message}`);
    return result;
  });

// Get referral stats
export const getReferralStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.rpc("get_referral_stats");
    if (error) throw new Error(`Failed to get referral stats: ${error.message}`);
    return data;
  });

// Get user list with pagination
export const getUserList = createServerFn({ method: "POST" })
  .inputValidator((input: { 
    page?: number; 
    limit?: number; 
    search?: string;
    plan?: string;
  }) => ({
    page: input.page || 1,
    limit: input.limit || 20,
    search: input.search || "",
    plan: input.plan || undefined,
  }))
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;
    
    let query = supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact" })
      .range(offset, offset + data.limit - 1)
      .order("created_at", { ascending: false });

    if (data.search) {
      query = query.or(`name.ilike.%${data.search}%,email.ilike.%${data.search}%`);
    }

    if (data.plan) {
      query = query.eq("plan", data.plan);
    }

    const { data: users, error, count } = await query;
    
    if (error) throw new Error(`Failed to get user list: ${error.message}`);
    
    return {
      users: users || [],
      total: count || 0,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil((count || 0) / data.limit),
    };
  });

// Get user details
export const getUserDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { userId: string }) => {
    if (!input.userId || typeof input.userId !== "string") {
      throw new Error("Invalid user ID");
    }
    return { userId: input.userId };
  })
  .handler(async ({ data }) => {
    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.userId)
      .single();

    if (error) throw new Error(`Failed to get user details: ${error.message}`);
    return user;
  });

// Admin Pro activation
export const adminGrantPro = createServerFn({ method: "POST" })
  .inputValidator((input: { 
    userId: string; 
    days: number; 
    reason: string;
    adminSessionId?: string;
  }) => {
    if (!input.userId || typeof input.userId !== "string") {
      throw new Error("Invalid user ID");
    }
    if (!input.days || typeof input.days !== "number" || input.days <= 0) {
      throw new Error("Invalid days value");
    }
    if (!input.reason || typeof input.reason !== "string") {
      throw new Error("Reason is required");
    }
    return {
      userId: input.userId,
      days: input.days,
      reason: input.reason,
      adminSessionId: input.adminSessionId,
    };
  })
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin.rpc("admin_grant_pro", {
      _user_id: data.userId,
      _days: data.days,
      _reason: data.reason,
      _admin_session_id: data.adminSessionId || null,
    });

    if (error) throw new Error(`Failed to grant Pro: ${error.message}`);
    return result;
  });

// Update user profile
export const updateUserProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { 
    userId: string; 
    updates: Record<string, unknown>;
  }) => {
    if (!input.userId || typeof input.userId !== "string") {
      throw new Error("Invalid user ID");
    }
    if (!input.updates || typeof input.updates !== "object") {
      throw new Error("Invalid updates");
    }
    return {
      userId: input.userId,
      updates: input.updates,
    };
  })
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("profiles")
      .update(data.updates)
      .eq("id", data.userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user profile: ${error.message}`);
    return result;
  });

// Get admin audit log
export const getAdminAuditLog = createServerFn({ method: "POST" })
  .inputValidator((input: { 
    page?: number; 
    limit?: number;
    action?: string;
    targetUserId?: string;
  }) => ({
    page: input.page || 1,
    limit: input.limit || 20,
    action: input.action,
    targetUserId: input.targetUserId,
  }))
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;
    
    let query = supabaseAdmin
      .from("admin_audit_log")
      .select("*", { count: "exact" })
      .range(offset, offset + data.limit - 1)
      .order("created_at", { ascending: false });

    if (data.action) {
      query = query.eq("action", data.action);
    }

    if (data.targetUserId) {
      query = query.eq("target_user_id", data.targetUserId);
    }

    const { data: logs, error, count } = await query;
    
    if (error) throw new Error(`Failed to get audit log: ${error.message}`);
    
    return {
      logs: logs || [],
      total: count || 0,
      page: data.page,
      limit: data.limit,
      totalPages: Math.ceil((count || 0) / data.limit),
    };
  });
