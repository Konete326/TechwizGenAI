import React, { useState, useEffect } from 'react';
import {
  X,
  ClockCounterClockwise,
  ArrowCounterClockwise,
  CheckCircle,
  FileText,
  CalendarBlank,
  SpinnerGap,
  GitBranch,
  ShieldCheck
} from '@phosphor-icons/react';
import { apiRequest } from './workspaceUtils.js';

export function RevisionHistoryModal({
  isOpen,
  onClose,
  projectId,
  currentVersion,
  onRestoreRevision
}) {
  const [revisions, setRevisions] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !projectId) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await apiRequest(`/workspace/projects/${projectId}/revisions`);
        if (res.success && Array.isArray(res.revisions)) {
          setRevisions(res.revisions);
          const current = res.revisions.find((r) => r.version === currentVersion) || res.revisions[0];
          setSelectedRevision(current || null);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to fetch revision history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, projectId, currentVersion]);

  const handleRestore = async (version) => {
    setRestoringVersion(version);
    setErrorMsg('');
    try {
      await onRestoreRevision(version);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to restore revision');
    } finally {
      setRestoringVersion(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ClockCounterClockwise size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Revision Timeline</h2>
              <p className="text-[11px] text-zinc-400">Immutable snapshot history; restore creates a new version without deleting history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <SpinnerGap size={24} className="animate-spin text-amber-400" />
              <span className="text-xs">Loading revisions timeline...</span>
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              No revisions recorded yet. Save a snapshot to create your first revision.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">
              {revisions.map((rev) => {
                const isCurrent = rev.version === currentVersion;
                const isSelected = selectedRevision?.version === rev.version;
                const isRestoringThis = restoringVersion === rev.version;
                const formattedDate = new Date(rev.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={rev._id || rev.version}
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedRevision(rev)}
                  >
                    <div
                      className={`absolute -left-[27px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                          : isSelected
                          ? 'bg-amber-400 text-black shadow-md ring-4 ring-amber-400/20'
                          : 'bg-zinc-900 border-2 border-zinc-700 text-zinc-500 group-hover:border-amber-400'
                      }`}
                    >
                      {isCurrent ? (
                        <CheckCircle size={12} weight="bold" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/5 border-amber-500/40 shadow-sm'
                          : isCurrent
                          ? 'bg-zinc-900/60 border-zinc-700/80 hover:border-zinc-600'
                          : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                            v{rev.version}
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {rev.summary || `Snapshot revision ${rev.version}`}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            disabled={restoringVersion !== null}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(rev.version);
                            }}
                            className="px-3 py-1 bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-xs"
                          >
                            {isRestoringThis ? (
                              <>
                                <SpinnerGap size={13} className="animate-spin" />
                                <span>Restoring...</span>
                              </>
                            ) : (
                              <>
                                <ArrowCounterClockwise size={13} />
                                <span>Restore as v{revisions[0]?.version ? revisions[0].version + 1 : rev.version + 1}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1">
                          <FileText size={13} /> {rev.filesCount} files
                        </span>
                        <span>{Math.round((rev.totalSize || 0) / 1024)} KB</span>
                        <span className="flex items-center gap-1">
                          <CalendarBlank size={13} /> {formattedDate}
                        </span>
                        {rev.sourceSha256 && (
                          <span className="truncate max-w-[120px] text-zinc-600">
                            #{rev.sourceSha256.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-400" />
            <span>All snapshots are immutable and content-hashed with sha256</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default RevisionHistoryModal;
