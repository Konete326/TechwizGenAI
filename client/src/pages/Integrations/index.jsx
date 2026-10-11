import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Plus, Trash, Eye, Circle, Check } from '@phosphor-icons/react';
import { VITE_API_URL, VITE_SERVER_URL } from "@/config/env";

const Integrations = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [selectedType, setSelectedType] = useState('CDN');
  const [copiedAppId, setCopiedAppId] = useState(null);
  const [copiedIdOnly, setCopiedIdOnly] = useState(null);
  const [codeModalApp, setCodeModalApp] = useState(null);
  const [modalCopied, setModalCopied] = useState(false);

  const fetchApps = () => {
    fetch(`${VITE_API_URL}/client/apps`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setApps(data.data.map(app => ({
            id: app.clientId,
            type: app.type,
            code: app.code,
            status: app.status,
            elementsCount: app.elementsCount || 0
          })));
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAddApp = async () => {
    if (apps.length >= 5) {
      return;
    }
    
    try {
      const baseUrl = VITE_SERVER_URL;
      const frontendUrl = window.location.origin;
      const res = await fetch(`${VITE_API_URL}/client/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, baseUrl, frontendUrl })
      });
      const data = await res.json();
      if (data.success) {
        const newApp = data.data;
        const mappedApp = { id: newApp.clientId, type: newApp.type, code: newApp.code, status: newApp.status, elementsCount: 0 };
        setApps(prev => [mappedApp, ...prev]);
        navigator.clipboard.writeText(newApp.code);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`${VITE_API_URL}/client/apps/${deleteTargetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setApps(prevApps => prevApps.filter(app => app.id !== deleteTargetId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedAppId(id);
    setTimeout(() => setCopiedAppId(null), 2000);
  };

  const handleCopyIdOnly = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedIdOnly(id);
    setTimeout(() => setCopiedIdOnly(null), 2000);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="pb-3 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Integrations & SDK</h2>
          <p className="text-xs text-text-muted mt-0.5">Manage your Nisa SDK and CDN integrations (Max 5).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={apps.length >= 5}
          className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus weight="bold" /> Add App
        </button>
      </div>

      <div className="bg-surface-card p-6 md:p-8 rounded-xl border border-border shadow-xs">
        <h2 className="text-lg font-semibold mb-6 text-text-primary">Your Integrations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted bg-surface/50">
                <th className="py-3 px-4 font-medium">Client ID & Code</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Connection Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm text-text-primary">
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => handleCopyIdOnly(app.id)}
                        className="truncate max-w-[140px] sm:max-w-none hover:text-accent cursor-pointer transition-colors"
                        title={copiedIdOnly === app.id ? "ID Copied!" : "Click to copy Client ID only"}
                      >
                        {app.id}
                      </span>
                      <button
                        onClick={() => handleCopyCode(app.id, app.code)}
                        className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-accent transition-colors cursor-pointer border border-border/60 hover:border-accent/40 flex items-center gap-1.5"
                        title={`Copy ${app.type} code (${app.type === 'CDN' ? 'script tag' : 'NPM import'})`}
                      >
                        {copiedAppId === app.id ? (
                          <>
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-sans text-emerald-600 font-semibold">Copied {app.type}!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span className="text-[10px] font-sans text-text-muted">Copy {app.type}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-surface text-text-primary border border-border px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide">
                      {app.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Circle 
                        weight="fill" 
                        size={10} 
                        className={app.status === 'Active' ? 'text-green-500 animate-pulse' : 'text-red-500'} 
                      />
                      <span className={`text-xs font-medium ${app.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                        {app.status === 'Active' ? `Connected (${app.elementsCount || 0} Elements)` : 'Disconnected'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => {
                          setCodeModalApp(app);
                          setModalCopied(false);
                        }} 
                        className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-accent/10 transition-colors cursor-pointer" 
                        title={`View & Copy ${app.type} Snippet`}
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => navigate(`/integrations/${app.id}`)} 
                        className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-accent/10 transition-colors cursor-pointer" 
                        title="Open DOM Inspector & UI Access Map"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteTargetId(app.id)} 
                        className="p-1.5 text-text-muted hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer" 
                        title="Delete Integration"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-text-muted text-sm">
                    No apps created yet. Click "Add App" to generate an SDK or CDN key.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-card p-6 md:p-8 rounded-xl border border-border shadow-xs">
        <h2 className="text-lg font-semibold mb-2 text-text-primary">5D Persistent Memory (Business Rules)</h2>
        <p className="text-xs text-text-muted mb-4">Teach Nisa permanent rules (e.g. '10% discount on orders over $1000').</p>
        <textarea 
          className="w-full h-32 p-3 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none transition-all" 
          placeholder="Enter rules here..."
        ></textarea>
        <button className="mt-4 bg-surface hover:bg-surface-elevated border border-border text-text-primary text-sm font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer">
          Save Rules
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-surface-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-text-primary">Create Integration</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-text-muted mb-4">Choose integration type. You can create up to 5 apps.</p>
              <div className="flex gap-4 mb-6">
                <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all ${selectedType === 'CDN' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:border-accent/50'}`}>
                  <input type="radio" name="type" className="hidden" checked={selectedType === 'CDN'} onChange={() => setSelectedType('CDN')} />
                  <div className="text-sm font-semibold text-text-primary">CDN Link</div>
                  <div className="text-[10px] text-text-muted mt-1">For HTML/Shopify/POS</div>
                </label>
                <label className={`flex-1 border rounded-xl p-4 cursor-pointer transition-all ${selectedType === 'SDK' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:border-accent/50'}`}>
                  <input type="radio" name="type" className="hidden" checked={selectedType === 'SDK'} onChange={() => setSelectedType('SDK')} />
                  <div className="text-sm font-semibold text-text-primary">NPM SDK</div>
                  <div className="text-[10px] text-text-muted mt-1">For React/Vue/Node</div>
                </label>
              </div>
              <button 
                onClick={handleAddApp}
                className="w-full bg-accent hover:bg-accent/90 text-white text-sm font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Copy weight="bold" /> Copy & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-surface-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-text-primary">Confirm Deletion</h3>
              <button onClick={() => setDeleteTargetId(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-text-muted">
                Are you sure you want to delete integration <span className="font-mono text-text-primary font-bold">{deleteTargetId}</span>? Nisa will no longer connect to this website.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-border text-text-primary rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Delete Integration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {codeModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-accent/10 text-accent rounded-lg border border-accent/20">
                  <Copy size={18} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">Integration Snippet</h3>
                    <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                      {codeModalApp.type}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-text-muted mt-0.5">{codeModalApp.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setCodeModalApp(null)} 
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-2">
                  {codeModalApp.type === 'CDN' 
                    ? 'Paste this script tag into the <head> or <body> of your external POS/CRM website:'
                    : 'Install the package and initialize Nisa inside your React, Vue, or frontend application:'}
                </p>

                <div className="relative rounded-xl overflow-hidden border border-border bg-[#0d1117] shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-white/[0.02]">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {codeModalApp.type === 'CDN' ? 'HTML script tag' : 'JavaScript / TypeScript'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeModalApp.code);
                        setModalCopied(true);
                        setTimeout(() => setModalCopied(false), 2000);
                      }}
                      className="text-[11px] font-mono flex items-center gap-1.5 text-zinc-300 hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {modalCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {modalCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-56">
                    {codeModalApp.code}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setCodeModalApp(null)}
                  className="px-4 py-2 bg-surface hover:bg-surface-elevated border border-border text-text-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeModalApp.code);
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2000);
                  }}
                  className="px-5 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  {modalCopied ? (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} weight="bold" />
                      <span>Copy {codeModalApp.type} Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
