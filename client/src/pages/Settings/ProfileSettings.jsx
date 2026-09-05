import { useState, useEffect } from "react";
import { Camera, Check, Trash } from "@phosphor-icons/react";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

export function ProfileSettings() {
  const toast = useToast();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  });
  const [name, setName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${VITE_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) {
          setUser(d.user); setName(d.user.name || ""); setProfileImage(d.user.profileImage || "");
          localStorage.setItem("user", JSON.stringify(d.user));
        }
      }).catch(() => {});
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image size must be under 5 MB");
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${VITE_API_URL}/assets`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.url) {
        setProfileImage(data.data.url);
        toast.success("Avatar uploaded to Cloudinary");
      } else toast.error("Failed to upload avatar");
    } catch {
      toast.error("Network error during avatar upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");
    const token = localStorage.getItem("token");
    if (!token) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${VITE_API_URL}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), profileImage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = { ...user, name: name.trim(), profileImage };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("profile_updated", { detail: updated }));
        toast.success("Profile updated successfully");
      } else toast.error(data.message || "Failed to update profile");
    } catch {
      toast.error("Network error while saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  const initial = (name || user?.name || "U")[0].toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-text-primary">Profile Details</h3>
        <p className="text-xs text-text-muted mt-0.5">Update personal display credentials and public avatar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full bg-surface-elevated border border-border flex items-center justify-center overflow-hidden shrink-0">
            {profileImage ? (
              <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-accent">{initial}</span>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white">Wait...</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-text-primary hover:border-accent hover:bg-surface-elevated transition-colors cursor-pointer">
              <Camera size={14} className="text-accent" />
              <span>{isUploading ? "Uploading..." : "Upload New Avatar"}</span>
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={isUploading} className="hidden" />
            </label>
            {profileImage && (
              <button type="button" onClick={() => setProfileImage("")} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer" title="Remove photo">
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 max-w-md">
          <label className="text-xs font-medium text-text-primary">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={50} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-hidden focus:border-accent" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <label className="text-xs font-medium text-text-muted">Account Email (Immutable)</label>
          <input type="email" value={user?.email || ""} disabled className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-border/60 text-xs text-text-muted cursor-not-allowed" />
        </div>

        <button type="submit" disabled={isSaving || isUploading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50">
          <Check size={14} weight="bold" />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </button>
      </form>
    </div>
  );
}

export default ProfileSettings;
