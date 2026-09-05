import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Gear, SignOut, Bell, ShieldCheck } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/context/ToastContext";

export function UserNavDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e?.detail) {
        setUser(e.detail);
      } else {
        try {
          setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        } catch {
          setUser({});
        }
      }
    };
    window.addEventListener("profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const name = user?.name || "Sameer";
  const email = user?.email || "admin@gmail.com";
  const role = user?.role || "admin";
  const profileImage = user?.profileImage || "";
  const initial = name ? name[0].toUpperCase() : "S";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("platform_usage_bytes");
    setIsLogoutModalOpen(false);
    setIsOpen(false);
    toast.info("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold text-xs hover:border-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all cursor-pointer overflow-hidden"
        aria-label="User account menu"
      >
        {profileImage ? (
          <img src={profileImage} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-[var(--radius-md)] bg-surface-card border border-border shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-semibold text-xs shrink-0 overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt={name} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary truncate">{name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 uppercase font-semibold">
                  {role}
                </span>
              </div>
              <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">{email}</p>
            </div>
          </div>

          <div className="py-1">
            {role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-accent hover:bg-surface transition-colors cursor-pointer"
              >
                <ShieldCheck size={15} />
                <span>Admin Governance</span>
              </Link>
            )}
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <User size={15} />
              <span>Profile</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <Gear size={15} />
              <span>Settings</span>
            </Link>
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <Bell size={15} />
              <span>Notifications</span>
            </Link>
          </div>

          <div className="pt-1 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <SignOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Sign Out"
        description="Are you sure you want to end your session? You will need to sign in again to access the admin dashboard."
        confirmText="Sign Out"
        isDestructive={true}
      />
    </div>
  );
}

export default UserNavDropdown;
