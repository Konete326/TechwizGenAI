import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle, Camera, Trash, Crop } from "@phosphor-icons/react";
import { AvatarCropModal } from "@/components/ui/AvatarCropModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ProfileForm } from "./ProfileForm";
import { useToast } from "@/context/ToastContext";
import { VITE_API_URL } from "@/config/env";

export function Profile() {
  const toast = useToast();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  });

  const [name, setName] = useState(currentUser?.name || "Sameer");
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || "");
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${VITE_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setName(data.user.name);
          setProfileImage(data.user.profileImage || "");
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("platform_usage_bytes");
    setIsLogoutModalOpen(false);
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const email = currentUser?.email || "admin@gmail.com";
  const role = currentUser?.role || "admin";
  const status = currentUser?.status || "active";
  const createdAt = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "September 3, 2026";
  const initial = name ? name[0].toUpperCase() : "S";

  const persistProfile = async (newName, newImage) => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
      const res = await fetch(`${VITE_API_URL}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), profileImage: newImage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = { ...currentUser, name: newName.trim(), profileImage: newImage };
        setCurrentUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("profile_updated", { detail: updated }));
        return true;
      }
    } catch { return false; }
    return false;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image size must be under 5 MB");
    const reader = new FileReader();
    reader.onload = () => { setRawImageForCrop(reader.result); setIsCropModalOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleConfirmRemovePhoto = async () => {
    setProfileImage("");
    setIsRemoveModalOpen(false);
    const success = await persistProfile(name, "");
    if (success) toast.success("Profile picture removed"); else toast.error("Failed to remove profile picture");
  };

  const handleApplyCrop = async (croppedUrl) => {
    setProfileImage(croppedUrl);
    setIsCropModalOpen(false);
    const success = await persistProfile(name, croppedUrl);
    if (success) toast.success("Profile picture cropped and saved"); else toast.error("Failed to save cropped picture");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");
    setIsSaving(true);
    const success = await persistProfile(name, profileImage);
    setIsSaving(false);
    if (success) toast.success("Profile updated successfully"); else toast.error("Failed to update profile");
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">User Profile</h2>
        <p className="text-xs text-text-muted mt-0.5">Manage administrative credentials, display identity, and security authorization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="relative p-6 rounded-[var(--radius-md)] bg-surface-card border border-border flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-accent/20 border-2 border-accent/40 text-accent font-bold text-3xl flex items-center justify-center shadow-lg overflow-hidden">
            {profileImage ? <img src={profileImage} alt={name} className="w-full h-full object-cover" /> : initial}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label htmlFor="profile-image-upload" className="w-8 h-8 rounded-full bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent flex items-center justify-center transition-colors cursor-pointer" title="Upload photo">
              <Camera size={15} />
              <input id="profile-image-upload" type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
            {profileImage && (
              <>
                <button type="button" onClick={() => { setRawImageForCrop(profileImage); setIsCropModalOpen(true); }} className="w-8 h-8 rounded-full bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent flex items-center justify-center transition-colors cursor-pointer" title="Crop photo">
                  <Crop size={15} />
                </button>
                <button type="button" onClick={() => setIsRemoveModalOpen(true)} className="w-8 h-8 rounded-full bg-rose-950/30 border border-rose-800/40 text-rose-400 hover:bg-rose-950/50 flex items-center justify-center transition-colors cursor-pointer" title="Remove photo">
                  <Trash size={14} />
                </button>
              </>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-base font-bold text-text-primary">{name}</h3>
            <p className="text-xs font-mono text-text-muted">{email}</p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border w-full justify-center">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold uppercase">
              <ShieldCheck size={12} weight="bold" /> {role}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold uppercase">
              <CheckCircle size={12} weight="bold" /> {status}
            </span>
          </div>
        </div>

        <ProfileForm
          name={name}
          setName={setName}
          email={email}
          createdAt={createdAt}
          isSaving={isSaving}
          onSubmit={handleUpdateProfile}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
      </div>

      <AvatarCropModal isOpen={isCropModalOpen} imageSrc={rawImageForCrop} onClose={() => setIsCropModalOpen(false)} onApply={handleApplyCrop} />

      <ConfirmModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleConfirmRemovePhoto}
        title="Remove Profile Picture"
        description="Are you sure you want to remove your profile picture? Your initials will be displayed instead."
        confirmText="Remove"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Sign Out"
        description="Are you sure you want to end your session? You will need to sign in again to access your account."
        confirmText="Sign Out"
        isDestructive={true}
      />
    </div>
  );
}

export default Profile;
