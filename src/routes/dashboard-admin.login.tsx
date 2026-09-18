import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export const Route = createFileRoute("/dashboard-admin/login")({ component: AdminLoginPage });

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network delay for security
    await new Promise(resolve => setTimeout(resolve, 500));

    if (verifyAdminPassword(password)) {
      createAdminSession();
      toast.success("Welcome back, Founder!");
      navigate({ to: "/dashboard-admin" });
    } else {
      toast.error("Invalid password");
      setPassword("");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
            <Shield className="h-8 w-8 text-teal" />
          </div>
          <h1 className="text-2xl font-bold text-near-black">Founder Dashboard</h1>
          <p className="mt-2 text-sm text-mid-grey">Enter your admin password to access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-near-black">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mid-grey" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-lg border border-light-grey bg-white px-4 py-3 pl-10 text-sm text-near-black placeholder:text-mid-grey focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal/90 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-teal hover:underline"
          >
            ← Back to Waqti
          </a>
        </div>
      </div>
    </div>
  );
}
