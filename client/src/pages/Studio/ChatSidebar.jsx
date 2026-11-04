import { useState, useMemo } from "react";
import { Plus, ChatCircleDots, Trash, SidebarSimple, PencilSimple, Check, X, MagnifyingGlass, User, Clock } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function groupSessionsByDate(sessions) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7Days = startOfToday - 7 * 86400000;
  const startOf30Days = startOfToday - 30 * 86400000;

  const groups = {
    today: [],
    yesterday: [],
    last7Days: [],
    last30Days: [],
    older: []
  };

  sessions.forEach((s) => {
    const time = new Date(s.updatedAt || s.createdAt || 0).getTime();
    if (time >= startOfToday) {
      groups.today.push(s);
    } else if (time >= startOfYesterday) {
      groups.yesterday.push(s);
    } else if (time >= startOf7Days) {
      groups.last7Days.push(s);
    } else if (time >= startOf30Days) {
      groups.last30Days.push(s);
    } else {
      groups.older.push(s);
    }
  });

  return [
    { label: "Today", items: groups.today },
    { label: "Yesterday", items: groups.yesterday },
    { label: "Previous 7 Days", items: groups.last7Days },
    { label: "Previous 30 Days", items: groups.last30Days },
    { label: "Older", items: groups.older }
  ].filter((g) => g.items.length > 0);
}

export function ChatSidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isLoading
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [search, setSearch] = useState("");

  const currentUser = useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (sessions || []).filter((s) => (s.title || "New Chat").toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [sessions, search]);

  const grouped = useMemo(() => groupSessionsByDate(filtered), [filtered]);

  if (!isOpen) return null;

  const handleStartRename = (e, s) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title || "New Chat");
  };

  const handleSaveRename = (e, id) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) onRenameSession(id, editTitle.trim());
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden" onClick={onClose} />
      <aside data-nesa-target="sidebar" className="w-68 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:bg-surface-card max-md:shadow-2xl md:relative border-r border-border/80 flex flex-col bg-surface/60 dark:bg-zinc-950/80 backdrop-blur h-full shrink-0 animate-in slide-in-from-left-4 duration-200">
        <div className="p-3 border-b border-border/70 flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-nesa-target="new_chat"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-between py-2 px-3 rounded-xl bg-surface-card hover:bg-surface border border-border/80 hover:border-accent/40 text-text-primary text-xs font-semibold shadow-xs transition-all cursor-pointer group disabled:opacity-50"
            title="Start new conversation"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-accent/15 text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus size={13} weight="bold" />
              </div>
              <span>New chat</span>
            </div>
            <span className="text-[10px] font-mono text-text-muted opacity-70">Ctrl+N</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-surface border border-border/70 text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors cursor-pointer shrink-0"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <SidebarSimple size={16} />
          </button>
        </div>

        <div className="px-3 pt-2.5 pb-1 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface border border-border/70 focus-within:border-accent transition-all">
            <MagnifyingGlass size={13} className="text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chat history..."
              className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-text-muted space-y-1">
              <Clock size={20} className="mx-auto opacity-40 mb-1" />
              <p className="font-semibold text-text-primary">
                {search ? "No matches found" : "No conversations yet"}
              </p>
              <p className="text-[11px]">
                {search ? "Try a different search query" : "Start a new chat to begin exploring."}
              </p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                  {group.label}
                </div>
                {group.items.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        onSelectSession(s.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-accent/15 text-accent border border-accent/30 font-semibold shadow-2xs"
                          : "text-text-muted hover:text-text-primary hover:bg-surface border border-transparent"
                      }`}
                    >
                      {editingId === s.id ? (
                        <div
                          className="flex items-center gap-1.5 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(e, s.id);
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setEditingId(null);
                              }
                            }}
                            autoFocus
                            className="flex-1 bg-surface text-text-primary px-1.5 py-0.5 rounded-md border border-accent text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(e, s.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Save name"
                          >
                            <Check size={13} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}
                            className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X size={13} weight="bold" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden pr-1">
                            <ChatCircleDots size={14} className={`shrink-0 ${isActive ? "text-accent" : "opacity-60"}`} />
                            <span className="truncate flex-1 min-w-0 block">
                              {s.title || "New Chat"}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, s)}
                              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                              title="Rename chat"
                              aria-label="Rename chat"
                            >
                              <PencilSimple size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(s);
                              }}
                              className="p-1 rounded-md text-text-muted hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                              title="Delete chat"
                              aria-label="Delete chat"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border/70 bg-surface/40 shrink-0">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-surface-card/60 border border-border/60">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-xs font-bold uppercase shrink-0 border border-accent/20">
                {currentUser?.name ? currentUser.name.charAt(0) : <User size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {currentUser?.name || "Active Workspace"}
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  {currentUser?.email || "Enhanced Studio"}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
              PRO
            </span>
          </div>
        </div>
      </aside>

      <ConfirmModal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${sessionToDelete?.title || "this chat"}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
      />
    </>
  );
}

export default ChatSidebar;
