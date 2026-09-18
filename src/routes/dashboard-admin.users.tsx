import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, User, Shield, ChevronLeft, ChevronRight, Crown, MoreVertical } from "lucide-react";
import { getUserList, adminGrantPro } from "@/lib/admin.server";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard-admin/users")({ component: UserManagement });

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, planFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUserList({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        plan: planFilter === "all" ? undefined : planFilter,
      });
      setUsers(result.users);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPro = async (userId: string, days: number) => {
    try {
      await adminGrantPro({
        userId,
        days,
        reason: "Admin manual grant",
      });
      toast.success(`Pro access granted for ${days} days`);
      loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setShowUserModal(false);
      }
    } catch (error) {
      console.error("Failed to grant Pro:", error);
      toast.error("Failed to grant Pro access");
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const UserRow = ({ user }: { user: any }) => (
    <tr className="border-b border-light-grey hover:bg-off-white">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-teal/10 flex items-center justify-center">
            <User className="h-4 w-4 text-teal" />
          </div>
          <div>
            <div className="font-medium text-near-black">{user.name}</div>
            <div className="text-xs text-mid-grey">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
          user.plan === 'pro' ? 'bg-gold/10 text-gold' : 'bg-grey/10 text-mid-grey'
        }`}>
          {user.plan === 'pro' ? <Crown className="h-3 w-3" /> : null}
          {user.plan === 'pro' ? 'PRO' : 'FREE'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-near-black">
        {user.student_type || 'N/A'}
      </td>
      <td className="px-4 py-3 text-sm text-near-black">
        {user.language === 'ar' ? 'Arabic' : 'English'}
      </td>
      <td className="px-4 py-3 text-sm text-mid-grey">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => handleViewUser(user)}
          className="text-sm text-teal hover:underline"
        >
          Manage
        </button>
      </td>
    </tr>
  );

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-near-black md:text-3xl">User Management</h1>
        <p className="mt-2 text-sm text-mid-grey">View and manage all user accounts</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mid-grey" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-light-grey bg-white px-4 py-2 pl-10 text-sm text-near-black placeholder:text-mid-grey focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPlanFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              planFilter === "all" ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setPlanFilter("pro")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              planFilter === "pro" ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
            }`}
          >
            Pro Users
          </button>
          <button
            onClick={() => setPlanFilter("free")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              planFilter === "free" ? "bg-teal text-white" : "bg-white text-near-black border border-light-grey"
            }`}
          >
            Free Users
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="surface-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-off-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Language</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-mid-grey uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-mid-grey">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-mid-grey">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => <UserRow key={user.id} user={user} />)
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-light-grey px-4 py-3">
            <div className="text-sm text-mid-grey">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-light-grey bg-white px-3 py-1 text-sm text-near-black disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-light-grey bg-white px-3 py-1 text-sm text-near-black disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="surface-card w-full max-w-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-near-black">User Details</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-mid-grey">Name</label>
                <div className="font-medium text-near-black">{selectedUser.name}</div>
              </div>
              <div>
                <label className="text-sm text-mid-grey">Email</label>
                <div className="font-medium text-near-black">{selectedUser.email}</div>
              </div>
              <div>
                <label className="text-sm text-mid-grey">Current Plan</label>
                <div className="font-medium text-near-black">
                  {selectedUser.plan === 'pro' ? 'Pro' : 'Free'}
                </div>
              </div>
              <div>
                <label className="text-sm text-mid-grey">Pro Expires</label>
                <div className="font-medium text-near-black">
                  {selectedUser.pro_expires_at 
                    ? new Date(selectedUser.pro_expires_at).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
              <div>
                <label className="text-sm text-mid-grey">Referral Credits</label>
                <div className="font-medium text-near-black">
                  {selectedUser.referral_credits_egp} EGP
                </div>
              </div>
            </div>

            {/* Pro Activation */}
            <div className="mt-6 border-t border-light-grey pt-6">
              <h3 className="text-sm font-semibold text-near-black mb-3">Grant Pro Access</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <button
                  onClick={() => handleGrantPro(selectedUser.id, 30)}
                  className="rounded-lg border-2 border-teal bg-teal px-4 py-3 text-sm font-medium text-white hover:bg-teal/90"
                >
                  Grant 1-Month Pro
                </button>
                <button
                  onClick={() => handleGrantPro(selectedUser.id, 270)}
                  className="rounded-lg border-2 border-gold bg-gold px-4 py-3 text-sm font-medium text-teal-dark hover:bg-gold/90"
                >
                  Grant 9-Month Pro
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="rounded-lg border border-light-grey bg-white px-4 py-2 text-sm font-medium text-near-black hover:bg-off-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
