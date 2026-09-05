import { useState } from "react";
import { Plus, ChatCircleDots, Trash, SidebarSimple, PencilSimple, Check, X, MagnifyingGlass, BookmarkSimple } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function ChatSidebar({ isOpen, onClose, sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession, onRenameSession, isLoading }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pinned_sessions") || "[]"); } catch { return []; }
  });

  if (!isOpen) return null;

  const togglePin = (id, e) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("pinned_sessions", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleStartRename = (e, s) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title || "New Chat"); };
  const handleSaveRename = (e, id) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) onRenameSession(id, editTitle.trim());
    setEditingId(null);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) { onDeleteSession(sessionToDelete.id); setSessionToDelete(null); }
  };

  const filtered = sessions.filter((s) => (s.title || "New Chat").toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => (pinnedIds.includes(b.id) ? 1 : 0) - (pinnedIds.includes(a.id) ? 1 : 0));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden" onClick={onClose} />
      <aside className="w-64 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:bg-surface-card max-md:shadow-2xl md:relative border-r border-border flex flex-col bg-surface/50 h-full shrink-0 animate-in slide-in-from-left-4 duration-150">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <button
            type="button"
            onClick={() => { onNewChat(); if (window.innerWidth < 768) onClose(); }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} weight="bold" /><span>New Chat</span>
          </button>
          <button type="button" onClick={onClose} className="p-2 rounded-[var(--radius-sm)] bg-surface border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors cursor-pointer shrink-0" title="Close History" aria-label="Close History">
            <SidebarSimple size={15} />
          </button>
        </div>
        <div className="px-2 pt-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border focus-within:border-accent">
            <MagnifyingGlass size={13} className="text-text-muted shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions..." className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none" />
            {search && <button type="button" onClick={() => setSearch("")} className="text-text-muted hover:text-text-primary cursor-pointer"><X size={12} /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span>Chat History</span>
            {sorted.length > 0 && <span className="text-[9px] text-text-muted/70">{sorted.length}</span>}
          </div>
          {sorted.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted">{search ? "No matching sessions found." : "No past sessions. Start a new chat to begin."}</div>
          ) : (
            sorted.map((s) => {
              const isActive = s.id === activeSessionId;
              const isPinned = pinnedIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => { onSelectSession(s.id); if (window.innerWidth < 768) onClose(); }}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-sm)] text-xs transition-colors duration-200 cursor-pointer ${isActive ? "bg-accent/15 text-accent border border-accent/30 font-semibold" : "text-text-muted hover:text-text-primary hover:bg-surface border border-transparent"}`}
                >
                  {editingId === s.id ? (
                    <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveRename(e, s.id); if (e.key === "Escape") { e.stopPropagation(); setEditingId(null); } }}
                        autoFocus
                        className="flex-1 bg-surface text-text-primary px-1.5 py-0.5 rounded border border-accent text-xs focus:outline-none"
                      />
                      <button type="button" onClick={(e) => handleSaveRename(e, s.id)} className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer" title="Save name"><Check size={13} weight="bold" /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer" title="Cancel"><X size={13} weight="bold" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <ChatCircleDots size={15} className="shrink-0" />
                        <span className="truncate flex-1 min-w-0 block">{s.title || "New Chat"}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => togglePin(s.id, e)}
                          className={`p-1 rounded transition-colors cursor-pointer ${isPinned ? "text-accent hover:text-accent-hover" : "text-text-muted hover:text-text-primary"}`}
                          title={isPinned ? "Unpin session" : "Pin session"}
                          aria-label={isPinned ? "Unpin session" : "Pin session"}
                        >
                          <BookmarkSimple size={13} weight={isPinned ? "fill" : "regular"} />
                        </button>
                        <button type="button" onClick={(e) => handleStartRename(e, s)} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer" title="Rename chat" aria-label="Rename chat"><PencilSimple size={13} /></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSessionToDelete(s); }} className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer" title="Delete chat" aria-label="Delete chat"><Trash size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
      <ConfirmModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Chat Session"
        description="Are you sure you want to permanently delete this chat session? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </>
  );
}

export default ChatSidebar;
