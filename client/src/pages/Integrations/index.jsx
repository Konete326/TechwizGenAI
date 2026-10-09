import React, { useState, useEffect } from 'react';
import { X, Copy, Plus, Trash, Eye, Circle, Code } from '@phosphor-icons/react';
import { VITE_API_URL, VITE_SERVER_URL } from "@/config/env";

const Integrations = () => {
  const [apps, setApps] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('CDN');
  const [viewApp, setViewApp] = useState(null);

  useEffect(() => {
    fetch(`${VITE_API_URL}/client/apps`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setApps(data.data.map(app => ({
            id: app.clientId,
            type: app.type,
            code: app.code,
            status: app.status
          })));
        }
      })
      .catch(err => console.error(err));

    const eventSource = new EventSource(`${VITE_API_URL}/client/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          setApps(prevApps => prevApps.map(app => 
            data.activeIds.includes(app.id) 
              ? { ...app, status: 'Active' } 
              : { ...app, status: 'Inactive' }
          ));
        } else if (data.type === 'status') {
          setApps(prevApps => prevApps.map(app => 
            app.id === data.clientId 
              ? { ...app, status: data.status, elementsCount: data.elementsCount || 0 } 
              : app
          ));
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAddApp = async () => {
    if (apps.length >= 5) {
      return;
    }
    
    try {
      // Pass the backend server URL so the CDN script points to port 5000 / Vercel API
      const baseUrl = VITE_SERVER_URL;
      const res = await fetch(`${VITE_API_URL}/client/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, baseUrl })
      });
      const data = await res.json();
      if (data.success) {
        const newApp = data.data;
        const mappedApp = { id: newApp.clientId, type: newApp.type, code: newApp.code, status: newApp.status };
        setApps(prev => [mappedApp, ...prev]);
        navigator.clipboard.writeText(newApp.code);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${VITE_API_URL}/client/apps/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setApps(prevApps => prevApps.filter(app => app.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
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
                <th className="py-3 px-4 font-medium">Client ID</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Connection Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-border hover:bg-surface/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm text-text-primary">{app.id}</td>
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
                      <button onClick={() => setViewApp(app)} className="text-text-muted hover:text-accent transition-colors cursor-pointer" title="View Code">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleDelete(app.id)} className="text-text-muted hover:text-red-500 transition-colors cursor-pointer" title="Delete">
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

      {viewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-surface-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-text-primary">Integration Details</h3>
              <button onClick={() => setViewApp(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="text-[10px] text-text-muted uppercase font-semibold mb-1">Client ID</div>
                <div className="font-mono text-xs bg-surface border border-border px-3 py-2 rounded-md text-text-primary">{viewApp.id}</div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted uppercase font-semibold mb-1">Embed Code ({viewApp.type})</div>
                <div className="relative group">
                  <pre className="bg-[#1e1e1e] border border-[#333] text-gray-300 p-4 rounded-lg text-xs overflow-x-auto">
                    <code className="break-all whitespace-pre-wrap">{viewApp.code}</code>
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(viewApp.code)}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-[10px] py-1 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
