import { User, Calendar, Clock } from "@phosphor-icons/react";
import { Loader } from "@/components/ui/Loader";

export function ProfileForm({ name, setName, email, createdAt, isSaving, onSubmit }) {
  return (
    <div className="md:col-span-2 relative p-6 rounded-[var(--radius-md)] bg-surface-card border border-border space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <User size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">Account Information</h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div>
          <label className="text-text-muted text-[11px] block mb-1 font-medium">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-8 px-3 rounded-[var(--radius-sm)] bg-surface border border-border text-text-primary focus:outline-none focus:border-accent font-medium text-xs"
            placeholder="Your full name"
            required
          />
        </div>

        <div>
          <label className="text-text-muted text-[11px] block mb-1 font-medium">Email Address</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full h-8 px-3 rounded-[var(--radius-sm)] bg-surface/50 border border-border text-text-muted font-mono text-xs cursor-not-allowed"
          />
          <span className="text-[10px] text-text-muted mt-1 block">Email is locked to primary administrator access.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60 text-[11px] font-mono text-text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} /> Joined: {createdAt}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={13} /> Session: Verified JWT
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer disabled:opacity-50"
          >
            {isSaving && <Loader size={13} className="text-white" />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileForm;
