import React, { useState, useMemo } from 'react';
import { 
  CursorClick, 
  Textbox, 
  Link as LinkIcon, 
  Article, 
  Check, 
  Copy, 
  MagnifyingGlass, 
  X,
  Lightning,
  Eye,
  Info,
  Sparkle
} from '@phosphor-icons/react';

export default function IntegrationSkeletonView({ elements = [], clientId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedElement, setSelectedElement] = useState(null);
  const [copiedXpath, setCopiedXpath] = useState(null);

  const categorized = useMemo(() => {
    const buttons = [];
    const inputs = [];
    const links = [];
    const readables = [];
    const learned = [];

    elements.forEach((el, idx) => {
      const item = { ...el, _id: idx };
      if (item.learned || item.source === 'demonstrated') {
        learned.push(item);
      }
      const tag = (item.element || '').toLowerCase();
      if (tag === 'button' || (tag === 'input' && (item.type === 'button' || item.type === 'submit'))) {
        buttons.push(item);
      } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        inputs.push(item);
      } else if (tag === 'a') {
        links.push(item);
      } else {
        readables.push(item);
      }
    });

    return { buttons, inputs, links, readables, learned };
  }, [elements]);

  const filteredElements = useMemo(() => {
    let list = elements.map((el, idx) => ({ ...el, _id: idx }));

    if (selectedFilter === 'buttons') {
      list = categorized.buttons;
    } else if (selectedFilter === 'inputs') {
      list = categorized.inputs;
    } else if (selectedFilter === 'links') {
      list = categorized.links;
    } else if (selectedFilter === 'readables') {
      list = categorized.readables;
    } else if (selectedFilter === 'learned') {
      list = categorized.learned;
    }

    if (!searchTerm.trim()) return list;

    const query = searchTerm.toLowerCase();
    return list.filter(item => {
      return (
        (item.text && item.text.toLowerCase().includes(query)) ||
        (item.element && item.element.toLowerCase().includes(query)) ||
        (item.xpath && item.xpath.toLowerCase().includes(query)) ||
        (item.placeholder && item.placeholder.toLowerCase().includes(query)) ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.ariaLabel && item.ariaLabel.toLowerCase().includes(query))
      );
    });
  }, [elements, selectedFilter, searchTerm, categorized]);

  const handleCopyXpath = (xpath, e) => {
    if (e) e.stopPropagation();
    if (!xpath) return;
    navigator.clipboard.writeText(xpath);
    setCopiedXpath(xpath);
    setTimeout(() => setCopiedXpath(null), 2000);
  };

  const getElementBadge = (el) => {
    if (el.learned || el.source === 'demonstrated') {
      return {
        label: 'Learned: Demonstrated',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: Sparkle,
        capability: 'Learned dynamically from user demonstration'
      };
    }
    const tag = (el.element || '').toLowerCase();
    if (tag === 'button' || (tag === 'input' && (el.type === 'button' || el.type === 'submit'))) {
      return {
        label: 'Actionable: Clickable',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: CursorClick,
        capability: 'Nisa can trigger clicks and submits'
      };
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return {
        label: 'Actionable: Editable',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        icon: Textbox,
        capability: 'Nisa can fill values and options'
      };
    }
    if (tag === 'a') {
      return {
        label: 'Actionable: Navigable',
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
        icon: LinkIcon,
        capability: 'Nisa can navigate to destination URL'
      };
    }
    return {
      label: 'Context: Readable',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: Article,
      capability: 'Nisa can read semantic DOM context'
    };
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              selectedFilter === 'all' ? 'bg-accent text-white font-semibold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All ({elements.length})
          </button>
          <button
            onClick={() => setSelectedFilter('buttons')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              selectedFilter === 'buttons' ? 'bg-emerald-600 text-white font-semibold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Buttons ({categorized.buttons.length})
          </button>
          <button
            onClick={() => setSelectedFilter('inputs')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              selectedFilter === 'inputs' ? 'bg-blue-600 text-white font-semibold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Inputs ({categorized.inputs.length})
          </button>
          <button
            onClick={() => setSelectedFilter('links')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              selectedFilter === 'links' ? 'bg-purple-600 text-white font-semibold' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Links ({categorized.links.length})
          </button>
          {categorized.learned.length > 0 && (
            <button
              onClick={() => setSelectedFilter('learned')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
                selectedFilter === 'learned' ? 'bg-amber-500 text-white font-semibold' : 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
              }`}
            >
              <Sparkle size={12} weight="fill" />
              Learned ({categorized.learned.length})
            </button>
          )}
        </div>

        <div className="relative w-64 max-w-full">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search nodes by text, XPath, tag..."
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-7 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 overflow-hidden">
        <div className="col-span-12 lg:col-span-7 h-full min-h-0 flex flex-col bg-surface-card rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0 bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              <span className="text-xs font-mono text-text-muted ml-1.5 font-medium">Screen Wireframe Preview</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Captured DOM ({elements.length})</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 bg-surface/30">
            {categorized.links.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon size={13} className="text-purple-500" />
                    <span>Navigation Links ({categorized.links.length})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-surface-card border border-border">
                  {categorized.links.map((link, idx) => (
                    <button
                      key={`link-${idx}`}
                      onClick={() => setSelectedElement(link)}
                      className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-left max-w-full truncate flex items-center gap-1 ${
                        selectedElement?._id === link._id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300'
                          : 'bg-surface border-purple-500/30 text-purple-600 dark:text-purple-400 hover:border-purple-500'
                      }`}
                    >
                      <span>{link.text || link.href || 'Link'}</span>
                      {(link.learned || link.source === 'demonstrated') && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded font-mono flex items-center gap-0.5">
                          <Sparkle size={9} weight="fill" /> Demo
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Lightning size={13} className="text-accent" />
                  <span>Actionable Controls ({categorized.inputs.length + categorized.buttons.length})</span>
                </div>
                <span className="text-[10px] text-text-muted">Click node to inspect XPath</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categorized.inputs.map((input, idx) => (
                  <div
                    key={`input-${idx}`}
                    onClick={() => setSelectedElement(input)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      selectedElement?._id === input._id
                        ? 'border-blue-500 bg-blue-500/10 shadow-xs ring-1 ring-blue-500'
                        : 'border-border bg-surface-card hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        &lt;{input.element}{input.type ? ` ${input.type}` : ''}&gt;
                      </span>
                      <div className="flex items-center gap-1">
                        {(input.learned || input.source === 'demonstrated') && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                            <Sparkle size={9} weight="fill" /> Demo
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted font-medium flex items-center gap-1">
                          <Textbox size={11} className="text-blue-500" />
                          Editable
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-text-primary truncate">
                      {input.placeholder ? `"${input.placeholder}"` : input.name ? input.name : input.text || 'Input Field'}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                      {input.xpath}
                    </div>
                  </div>
                ))}

                {categorized.buttons.map((btn, idx) => (
                  <div
                    key={`btn-${idx}`}
                    onClick={() => setSelectedElement(btn)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      selectedElement?._id === btn._id
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500'
                        : 'border-border bg-surface-card hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        &lt;{btn.element}&gt;
                      </span>
                      <div className="flex items-center gap-1">
                        {(btn.learned || btn.source === 'demonstrated') && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                            <Sparkle size={9} weight="fill" /> Demo
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <CursorClick size={11} className="text-emerald-500" />
                          Clickable
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-text-primary truncate">
                      {btn.text || btn.ariaLabel || 'Button Action'}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted truncate mt-0.5">
                      {btn.xpath}
                    </div>
                  </div>
                ))}
              </div>

              {categorized.buttons.length === 0 && categorized.inputs.length === 0 && (
                <div className="py-8 text-center text-text-muted text-xs border border-dashed border-border rounded-lg">
                  No interactive buttons or inputs detected in this snapshot.
                </div>
              )}
            </div>

            {categorized.readables.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Article size={13} className="text-amber-500" />
                  <span>Semantic Content ({categorized.readables.length})</span>
                </div>
                <div className="space-y-1">
                  {categorized.readables.map((read, idx) => (
                    <div
                      key={`read-${idx}`}
                      onClick={() => setSelectedElement(read)}
                      className={`p-2 rounded-md border text-xs transition-all cursor-pointer flex items-center justify-between ${
                        selectedElement?._id === read._id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-border bg-surface-card hover:border-amber-500/40'
                      }`}
                    >
                      <span className="truncate text-text-primary text-xs max-w-[80%]">
                        {read.text}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted shrink-0 ml-2">
                        &lt;{read.element}&gt;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 h-full min-h-0 flex flex-col gap-2.5 overflow-hidden">
          <div className="shrink-0 bg-surface-card rounded-xl border border-border p-3 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Eye size={15} className="text-accent" />
                <span>Node Inspector</span>
              </h3>
              {selectedElement && (
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedElement ? (
              <div className="space-y-2">
                {(() => {
                  const badge = getElementBadge(selectedElement);
                  const BadgeIcon = badge.icon;
                  return (
                    <div className={`p-2 rounded-lg border flex items-center gap-2 ${badge.color}`}>
                      <BadgeIcon size={18} weight="bold" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{badge.label}</div>
                        <div className="text-[10px] opacity-80 truncate">{badge.capability}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0">Tag:</span>
                    <span className="font-mono text-[11px] bg-surface border border-border px-2 py-0.5 rounded text-text-primary">
                      &lt;{selectedElement.element}{selectedElement.type ? ` type="${selectedElement.type}"` : ''} /&gt;
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0 pt-0.5">Value:</span>
                    <span className="bg-surface border border-border px-2 py-0.5 rounded text-text-primary break-words flex-1 text-[11px]">
                      {selectedElement.text || selectedElement.placeholder || selectedElement.name || '(None)'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0 pt-0.5">XPath:</span>
                    <div className="flex-1 flex items-center justify-between gap-1 bg-surface border border-border px-2 py-0.5 rounded min-w-0">
                      <span className="font-mono text-[10px] text-text-primary truncate">
                        {selectedElement.xpath || 'N/A'}
                      </span>
                      <button
                        onClick={(e) => handleCopyXpath(selectedElement.xpath, e)}
                        className="text-accent hover:underline text-[10px] flex items-center gap-0.5 shrink-0 cursor-pointer"
                        title="Copy XPath"
                      >
                        {copiedXpath === selectedElement.xpath ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedXpath === selectedElement.xpath ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {selectedElement.placeholder && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0">Placeholder:</span>
                      <span className="text-[11px] bg-surface border border-border px-2 py-0.5 rounded text-text-primary truncate flex-1">
                        {selectedElement.placeholder}
                      </span>
                    </div>
                  )}

                  {selectedElement.name && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0">Field Name:</span>
                      <span className="font-mono text-[10px] bg-surface border border-border px-2 py-0.5 rounded text-text-primary truncate flex-1">
                        {selectedElement.name}
                      </span>
                    </div>
                  )}

                  {selectedElement.href && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-text-muted w-14 shrink-0">Href:</span>
                      <span className="font-mono text-[10px] bg-surface border border-border px-2 py-0.5 rounded text-text-primary truncate flex-1">
                        {selectedElement.href}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-3 px-3 text-center text-text-muted text-xs border border-dashed border-border rounded-lg flex items-center justify-center gap-2">
                <Info size={16} className="text-text-muted/60 shrink-0" />
                <span className="text-[11px]">Click any node in wireframe or list to inspect details.</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 bg-surface-card rounded-xl border border-border flex flex-col overflow-hidden shadow-xs">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0 bg-surface/50">
              <h3 className="text-xs font-bold text-text-primary">
                Actionable Nodes ({filteredElements.length})
              </h3>
              <span className="text-[10px] text-text-muted">
                {filteredElements.length} Total Captured
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {filteredElements.map((el) => {
                const badge = getElementBadge(el);
                const BadgeIcon = badge.icon;
                const isSelected = selectedElement?._id === el._id;
                return (
                  <div
                    key={el._id}
                    onClick={() => setSelectedElement(el)}
                    className={`p-2 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-border bg-surface-card hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1 rounded-md shrink-0 ${badge.color}`}>
                        <BadgeIcon size={12} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-text-primary truncate text-xs flex items-center gap-1.5">
                          <span className="truncate">{el.text || el.placeholder || el.name || `<${el.element}>`}</span>
                          {(el.learned || el.source === 'demonstrated') && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded font-mono shrink-0 flex items-center gap-0.5">
                              <Sparkle size={9} weight="fill" /> Demo
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted truncate">
                          {el.xpath}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleCopyXpath(el.xpath, e)}
                      title="Copy XPath"
                      className="p-1 text-text-muted hover:text-accent rounded transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedXpath === el.xpath ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                );
              })}

              {filteredElements.length === 0 && (
                <div className="py-6 text-center text-text-muted text-xs">
                  No elements matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
