import { useState, useEffect } from "react";
import { ShieldCheck, UserCheck, UserMinus, ArrowClockwise, MagnifyingGlass, Users } from "@phosphor-icons/react";
import { VITE_API_URL } from "@/config/env";
import { useToast } from "@/context/ToastContext";
import { Loader } from "@/components/ui/Loader";

export function UserManagementView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setUsers(data.data);
    } catch {
      toast.error("Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setUpdatingId(userId);
    try {
      const res = await fetch(`${VITE_API_URL}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => ((u.id || u._id) === userId ? { ...u, status: data.data.status } : u)));
        toast.success(`User status changed to ${data.data.status}`);
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch {
      toast.error("Network error while toggling status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const term = search.toLowerCase();
    return (u.name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Users size={22} className="text-accent" />
            <span>User Governance</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">Manage user account statuses and track token consumption metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border focus-within:border-accent">
            <MagnifyingGlass size={14} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter users..."
              className="bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none w-36 sm:w-48"
            />
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 rounded-[var(--radius-sm)] bg-surface border border-border hover:border-accent text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Refresh"
            aria-label="Refresh users"
          >
            {loading ? <Loader size={14} className="text-accent" /> : <ArrowClockwise size={14} />}
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-[var(--radius-md)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/80 font-mono text-[11px] text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Tokens Used</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader size={24} className="text-accent" />
                      <span className="text-xs">Loading user metrics...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-text-muted">No users found.</td></tr>
              ) : (
                filtered.map((user) => {
                  const uid = user.id || user._id;
                  const isAdmin = user.role === "admin";
                  const isSuspended = user.status === "suspended";
                  const isBusy = updatingId === uid;
                  return (
                    <tr key={uid} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 text-accent font-semibold text-[11px] flex items-center justify-center shrink-0">
                            {(user.name ? user.name[0] : "U").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-text-primary block truncate">{user.name}</span>
                            <span className="font-mono text-[10px] text-text-muted block truncate">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${isAdmin ? "bg-purple-500/10 text-purple-400 border-purple-500/20 font-semibold" : "bg-surface text-text-muted border-border"}`}>
                          {isAdmin && <ShieldCheck size={11} />}{user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text-primary font-medium">
                        {(user.totalTokensUsed || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${isSuspended ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"}`}>
                          {user.status || "active"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <span className="text-[10px] font-mono text-text-muted px-2 py-1">Protected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(uid)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] font-medium text-xs transition-colors btn-tactile cursor-pointer border ${isSuspended ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"}`}
                          >
                            {isBusy ? <Loader size={12} className={isSuspended ? "text-emerald-400" : "text-rose-400"} /> : isSuspended ? <UserCheck size={12} /> : <UserMinus size={12} />}
                            <span>{isSuspended ? "Activate" : "Suspend"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserManagementView;
