import React, { useState, useMemo } from 'react';
import { Copy, Check, DownloadSimple, MagnifyingGlass, FileCode, X } from '@phosphor-icons/react';

export default function IntegrationJsonView({ elements = [], clientId }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedFiltered, setCopiedFiltered] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const jsonString = useMemo(() => {
    return JSON.stringify(elements, null, 2);
  }, [elements]);

  const filteredJsonString = useMemo(() => {
    if (!searchTerm.trim()) return jsonString;
    const query = searchTerm.toLowerCase();
    const filtered = elements.filter(el => {
      const str = JSON.stringify(el).toLowerCase();
      return str.includes(query);
    });
    return JSON.stringify(filtered, null, 2);
  }, [elements, jsonString, searchTerm]);

  const jsonSizeKB = useMemo(() => {
    const bytes = new Blob([jsonString]).size;
    return (bytes / 1024).toFixed(2);
  }, [jsonString]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyFiltered = () => {
    navigator.clipboard.writeText(filteredJsonString);
    setCopiedFiltered(true);
    setTimeout(() => setCopiedFiltered(false), 2000);
  };

  const handleDownloadAll = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nisa_dom_${clientId || 'data'}_all.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isFiltering = Boolean(searchTerm.trim());

  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface-card px-3 py-2 rounded-xl border border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <FileCode size={16} weight="bold" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-primary">DOM JSON Payload</span>
            <span className="text-[10px] text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded">
              {elements.length} Nodes Total
            </span>
            <span className="text-[10px] text-text-muted bg-surface border border-border px-1.5 py-0.5 rounded">
              {jsonSizeKB} KB
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-56 max-w-full">
            <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or filter keys..."
              className="w-full bg-surface border border-border rounded-lg pl-7 pr-6 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {isFiltering && (
            <button
              onClick={handleCopyFiltered}
              className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-border hover:border-accent text-text-primary rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy filtered JSON snippet"
            >
              {copiedFiltered ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedFiltered ? 'Copied Filtered' : 'Copy Filtered'}</span>
            </button>
          )}

          <button
            onClick={handleCopyAll}
            className="px-2.5 py-1 bg-surface hover:bg-surface-elevated border border-border hover:border-accent text-text-primary rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy complete JSON of all captured nodes"
          >
            {copiedAll ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copiedAll ? 'Copied All JSON' : 'Copy All JSON'}</span>
          </button>

          <button
            onClick={handleDownloadAll}
            className="px-2.5 py-1 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download complete JSON file"
          >
            <DownloadSimple size={13} weight="bold" />
            <span>Download All JSON</span>
          </button>
        </div>
      </div>

      <div className="w-full h-[380px] sm:h-[420px] max-h-[calc(100vh-230px)] bg-[#09090b] border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
        <div className="px-3 py-1.5 bg-[#121215] border-b border-white/5 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            <span className="font-mono text-[11px] text-gray-400 ml-1.5">payload.json</span>
            {isFiltering && (
              <span className="text-[10px] text-accent font-sans ml-2">
                Filtered: "{searchTerm}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyAll}
              className="px-2 py-0.5 rounded text-[11px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer border border-white/10"
              title="Copy All JSON"
            >
              {copiedAll ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="px-2 py-0.5 rounded text-[11px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer border border-white/10"
              title="Download All JSON"
            >
              <DownloadSimple size={11} />
              <span>Download</span>
            </button>
          </div>
        </div>

        <pre className="flex-1 min-h-0 p-3 font-mono text-[11px] text-emerald-400/90 overflow-auto leading-relaxed selection:bg-accent selection:text-white">
          <code>{filteredJsonString}</code>
        </pre>
      </div>
    </div>
  );
}
