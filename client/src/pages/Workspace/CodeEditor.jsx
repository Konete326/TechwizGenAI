import React, { useRef, useMemo, useState } from 'react';
import { Code, Sparkle, CaretDown, PlusCircle } from '@phosphor-icons/react';

const BUILD_PRESETS = [
  {
    label: 'Hero Badge & Headline',
    desc: 'Prominent header banner with badge and call to action',
    snippet: `<div data-nisa-new="true" class="p-6 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/5 border border-amber-500/30 rounded-2xl text-center space-y-3 shadow-xl my-4">
  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">✦ Nisa Generated Banner</span>
  <h2 class="text-xl font-bold tracking-tight text-white">Elevate Your Digital Experience</h2>
  <p class="text-xs text-zinc-400 max-w-sm mx-auto">Precision engineered UI generated in real-time with durable persistence and scoped construction.</p>
</div>`
  },
  {
    label: 'Stats Metric Grid',
    desc: 'Three-column metric summary cards with values and labels',
    snippet: `<div data-nisa-new="true" class="grid grid-cols-3 gap-3 my-4">
  <div class="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
    <div class="text-lg font-bold text-amber-400">99.9%</div>
    <div class="text-[10px] text-zinc-500 uppercase font-medium">Uptime</div>
  </div>
  <div class="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
    <div class="text-lg font-bold text-emerald-400">0.05ms</div>
    <div class="text-[10px] text-zinc-500 uppercase font-medium">Latency</div>
  </div>
  <div class="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
    <div class="text-lg font-bold text-sky-400">10k+</div>
    <div class="text-[10px] text-zinc-500 uppercase font-medium">Users</div>
  </div>
</div>`
  },
  {
    label: 'Interactive CTA Card',
    desc: 'Action container with button and helper text',
    snippet: `<div data-nisa-new="true" class="p-5 bg-zinc-900/90 border border-amber-500/20 rounded-xl flex items-center justify-between gap-4 my-4">
  <div class="space-y-1">
    <h3 class="text-sm font-semibold text-white">Unlock Agentic Capabilities</h3>
    <p class="text-xs text-zinc-400">Deploy high-performance workflows with one click.</p>
  </div>
  <button class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition-all shadow-md shrink-0 cursor-pointer">
    Get Started
  </button>
</div>`
  }
];

export function CodeEditor({
  activeFile,
  onChangeContent,
  isUnsaved,
  onApplyBuild
}) {
  const textareaRef = useRef(null);
  const [isBuildMenuOpen, setIsBuildMenuOpen] = useState(false);

  const lines = useMemo(() => {
    if (!activeFile || typeof activeFile.content !== 'string') return [1];
    const count = activeFile.content.split('\n').length;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  }, [activeFile?.content]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + '  ' + val.substring(end);
      onChangeContent(updated);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const handleSelectPreset = (preset) => {
    setIsBuildMenuOpen(false);
    if (onApplyBuild) {
      onApplyBuild(preset.snippet, activeFile?.path || 'index.html');
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        Select a file from the explorer to begin editing
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 border-r border-zinc-800/80 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/40 text-xs">
        <div className="flex items-center gap-2">
          <Code size={15} className="text-amber-400" />
          <span className="font-mono text-zinc-200 font-medium">{activeFile.path}</span>
          {isUnsaved && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {onApplyBuild && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBuildMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium transition-colors cursor-pointer"
                title="Apply AI Build Change to this file"
              >
                <Sparkle size={12} weight="fill" />
                <span>Nisa Build</span>
                <CaretDown size={10} />
              </button>

              {isBuildMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Insert Build Preset
                  </div>
                  {BUILD_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="w-full text-left p-2 rounded-lg hover:bg-zinc-800/80 transition-colors flex flex-col gap-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 group-hover:text-amber-300">
                        <PlusCircle size={13} className="text-amber-400" />
                        <span>{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 line-clamp-1">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
            <span>{lines.length} lines</span>
            <span>{activeFile.content?.length || 0} chars</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden font-mono text-xs leading-relaxed relative">
        <div className="w-11 py-3 bg-zinc-950/80 text-zinc-600 text-right pr-3 select-none border-r border-zinc-900 shrink-0 overflow-hidden font-mono">
          {lines.map((num) => (
            <div key={num} className="h-5">
              {num}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={activeFile.content || ''}
          onChange={(e) => onChangeContent(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 p-3 bg-transparent text-zinc-100 outline-none resize-none overflow-auto font-mono whitespace-pre leading-5 selection:bg-amber-500/20"
        />
      </div>
    </div>
  );
}

export default CodeEditor;
