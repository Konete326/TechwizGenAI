import React, { useState } from 'react';
import {
  FloppyDisk,
  ClockCounterClockwise,
  Plus,
  CloudCheck,
  HardDrive,
  SpinnerGap,
  Sparkle,
  CaretDown
} from '@phosphor-icons/react';

export function WorkspaceHeader({
  activeProject,
  projects,
  isLocalDraft,
  statusMessage,
  isSaving,
  isUnsaved,
  onSelectProject,
  onOpenNewModal,
  onOpenHistory,
  onSaveSnapshot
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-12 border-b border-zinc-800 bg-zinc-900/60 px-4 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/80 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            <Sparkle size={14} className="text-amber-400" />
            <span className="max-w-[160px] truncate">{activeProject?.name || 'Workspace'}</span>
            <CaretDown size={12} className="text-zinc-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Select Project
              </div>
              {projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onSelectProject(p);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    p._id === activeProject?._id
                      ? 'bg-amber-500/10 text-amber-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.isLocal ? (
                    <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400 font-normal">Local</span>
                  ) : (
                    <span className="text-[10px] px-1 rounded bg-zinc-800 text-amber-400 font-mono">v{p.activeVersion || 1}</span>
                  )}
                </button>
              ))}
              <div className="border-t border-zinc-800 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenNewModal();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 font-medium"
                >
                  <Plus size={14} /> Create New Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {isLocalDraft ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700/80">
            <HardDrive size={12} /> Local-Only (Browser Draft)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CloudCheck size={12} /> Cloud Synced · v{activeProject?.activeVersion || 1}
          </span>
        )}

        {statusMessage && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded animate-in fade-in ${
              statusMessage.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {statusMessage.text}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isLocalDraft && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700"
          >
            <ClockCounterClockwise size={14} className="text-amber-400" />
            <span>History</span>
            <span className="font-mono text-[10px] px-1 py-0.2 bg-zinc-900 rounded text-zinc-400">
              {activeProject?.totalRevisions || 1}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveSnapshot}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md ${
            isUnsaved
              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
          }`}
        >
          {isSaving ? (
            <>
              <SpinnerGap size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FloppyDisk size={14} />
              <span>{isUnsaved ? 'Save Revision' : 'Saved'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

export default WorkspaceHeader;

