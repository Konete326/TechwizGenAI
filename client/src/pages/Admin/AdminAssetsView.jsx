import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { HardDrive, MagnifyingGlass, ArrowClockwise, Copy, Check, Trash, Users } from "@phosphor-icons/react";
import { VITE_API_URL } from "@/config/env";
import { useToast } from "@/context/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetPreviewModal } from "../Assets/AssetPreviewModal";

export function AdminAssetsView() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const toast = useToast();

  const fetchAssets = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${VITE_API_URL}/admin/assets`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setAssets(data.data);
    } catch {
      toast.error("Failed to load global tenant assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const handleCopy = async (id, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${VITE_API_URL}/assets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        toast.success("Tenant asset purged successfully");
      }
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  const formatSize = (b) => {
    if (!b) return "0 KB";
    const kb = b / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const term = search.toLowerCase().trim();
    return assets.filter((a) => (a.title || "").toLowerCase().includes(term) || (a.ownerName || "").toLowerCase().includes(term) || (a.ownerEmail || "").toLowerCase().includes(term) || (a.format || "").toLowerCase().includes(term));
  }, [assets, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-[var(--radius-sm)] bg-surface border border-border">
              <Users size={14} /><span>Users</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent px-2.5 py-1 rounded-[var(--radius-sm)] bg-accent/10 border border-accent/30">
              <HardDrive size={14} /><span>Global Tenant Assets</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Platform Asset Oversight</h1>
          <p className="text-xs text-text-muted mt-0.5">Admin-exclusive global inventory across all tenant uploads.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border focus-within:border-accent">
            <MagnifyingGlass size={14} className="text-text-muted shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter assets or user..." className="bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none w-44" />
          </div>
          <button type="button" onClick={fetchAssets} disabled={loading} className="p-2 rounded-[var(--radius-sm)] bg-surface border border-border hover:border-accent text-text-muted hover:text-text-primary cursor-pointer" title="Refresh">
            <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-[var(--radius-md)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/80 font-mono text-[11px] text-text-muted uppercase tracking-wider">
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-4"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-text-muted">No tenant assets found.</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <button type="button" onClick={() => setPreviewAsset(a)} className="font-semibold text-text-primary hover:text-accent truncate block max-w-xs text-left cursor-pointer">
                        {a.title}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="min-w-0">
                        <span className="font-medium text-text-primary block truncate text-[11px]">{a.ownerName || "Unknown"}</span>
                        <span className="font-mono text-[10px] text-text-muted block truncate">{a.ownerEmail || ""}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[10px] uppercase bg-surface border border-border text-text-primary">{a.format}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-text-muted">{formatSize(a.bytes)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-text-muted">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => handleCopy(a.id, a.url)} className="p-1 rounded bg-surface border border-border hover:border-accent text-text-muted hover:text-text-primary cursor-pointer" title="Copy Link">
                          {copiedId === a.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                        <button type="button" onClick={() => handleDelete(a.id)} className="p-1 rounded bg-surface border border-border hover:border-rose-500/50 text-text-muted hover:text-rose-400 cursor-pointer" title="Delete">
                          <Trash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </div>
  );
}

export default AdminAssetsView;
