import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Circle, 
  Copy, 
  Check, 
  ArrowsClockwise, 
  Layout, 
  Code, 
  Broadcast
} from '@phosphor-icons/react';
import { VITE_API_URL } from '@/config/env';
import IntegrationSkeletonView from './IntegrationSkeletonView';
import IntegrationJsonView from './IntegrationJsonView';

export default function IntegrationDetails() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('skeleton');
  const [app, setApp] = useState(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());

  const fetchData = useCallback(async (isManual = false) => {
    if (!clientId) return;
    if (isManual) setRefreshing(true);

    try {
      const [appsRes, domRes] = await Promise.all([
        fetch(`${VITE_API_URL}/client/apps`),
        fetch(`${VITE_API_URL}/client/dom/${clientId}`)
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.success && Array.isArray(appsData.data)) {
          const currentApp = appsData.data.find(a => a.clientId === clientId);
          if (currentApp) {
            setApp(currentApp);
            if (currentApp.domData && Array.isArray(currentApp.domData) && currentApp.domData.length > 0) {
              setElements(prev => (prev && prev.length > 0 ? prev : currentApp.domData));
            }
          }
        }
      }

      if (domRes.ok) {
        const domData = await domRes.json();
        if (domData.success && Array.isArray(domData.data) && domData.data.length > 0) {
          setElements(domData.data);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 3000);

    let sse;
    try {
      sse = new EventSource(`${VITE_API_URL}/client/stream`);
      sse.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.clientId === clientId) {
            fetchData();
          }
        } catch (err) {}
      };
    } catch (err) {}

    return () => {
      clearInterval(interval);
      if (sse) sse.close();
    };
  }, [clientId, fetchData]);

  const handleLiveSync = async () => {
    if (!clientId) return;
    setRefreshing(true);
    try {
      const syncRes = await fetch(`${VITE_API_URL}/client/request-sync/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.success && Array.isArray(syncData.data) && syncData.data.length > 0) {
          setElements(syncData.data);
        }
        if (syncData.liveConnected) {
          setSyncFeedback('Live Client Synced');
        } else {
          setSyncFeedback('Snapshot Synced');
        }
      }
      await new Promise(r => setTimeout(r, 400));
      await fetchData(false);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      await fetchData(false);
      setSyncFeedback('Synced');
    } finally {
      setRefreshing(false);
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  const handleCopyId = () => {
    if (!clientId) return;
    navigator.clipboard.writeText(clientId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyCode = () => {
    if (!app?.code) return;
    navigator.clipboard.writeText(app.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isConnected = app?.status === 'Active' || elements.length > 0;

  if (loading && !app && elements.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-text-muted font-medium">Connecting to client integration...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 pb-2 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/integrations')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer shrink-0"
            title="Back to Integrations"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-text-primary tracking-tight shrink-0">
              Integration Inspector
            </h1>
            <div className="font-mono text-xs bg-surface border border-border px-2 py-0.5 rounded text-text-muted flex items-center gap-1.5 shrink-0">
              <span className="text-text-primary truncate max-w-[140px] sm:max-w-[200px]">{clientId}</span>
              <button
                onClick={handleCopyId}
                title="Copy Client ID"
                className="text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            <span className="bg-surface text-text-muted border border-border px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 hidden sm:inline-block">
              {app?.type || 'CDN'}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface border border-border text-[11px] shrink-0">
              <Circle
                weight="fill"
                size={7}
                className={isConnected ? 'text-emerald-500 animate-pulse' : 'text-red-500'}
              />
              <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 font-medium'}>
                {isConnected ? `${elements.length} Elements` : 'Offline'}
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] text-text-muted hidden md:inline-block">
                Last: {lastSyncTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-surface border border-border p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('skeleton')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'skeleton'
                  ? 'bg-surface-card text-accent font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Layout size={14} weight={activeTab === 'skeleton' ? 'bold' : 'regular'} />
              <span>Wireframe</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-surface-card text-accent font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Code size={14} weight={activeTab === 'json' ? 'bold' : 'regular'} />
              <span>JSON</span>
            </button>
          </div>

          <button
            onClick={handleLiveSync}
            disabled={refreshing}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
              refreshing
                ? 'bg-accent/15 border-accent text-accent'
                : syncFeedback
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'bg-surface hover:bg-surface-elevated border-border hover:border-accent text-text-primary'
            }`}
            title="Rescan and sync DOM live from client page"
          >
            {syncFeedback ? (
              <Check size={13} className="text-emerald-500" weight="bold" />
            ) : (
              <ArrowsClockwise size={13} className={refreshing ? 'animate-spin text-accent' : ''} />
            )}
            <span className="hidden sm:inline">
              {refreshing ? 'Syncing...' : syncFeedback ? syncFeedback : 'Sync'}
            </span>
          </button>

          {app?.code && (
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
              <span className="hidden sm:inline">{copiedCode ? 'Copied' : 'Embed Code'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {elements.length === 0 ? (
          <div className="h-full bg-surface-card rounded-xl border border-border p-6 flex flex-col items-center justify-center text-center overflow-y-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent mx-auto flex items-center justify-center animate-pulse">
              <Broadcast size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-text-primary">Waiting for Client Page Connection</h3>
              <p className="text-xs text-text-muted">
                Embed the client snippet into your application. When the page is loaded, actionable controls and form elements will appear here live.
              </p>
            </div>

            {app?.code && (
              <div className="w-full max-w-lg mx-auto text-left space-y-1.5">
                <div className="text-[10px] font-semibold uppercase text-text-muted">Embed Script ({app.type})</div>
                <div className="relative group">
                  <pre className="p-3 bg-[#09090b] text-gray-300 rounded-lg font-mono text-[11px] overflow-x-auto border border-border">
                    <code>{app.code}</code>
                  </pre>
                  <button
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] transition-colors cursor-pointer border border-white/10 flex items-center gap-1"
                  >
                    {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          activeTab === 'skeleton' ? (
            <IntegrationSkeletonView elements={elements} clientId={clientId} />
          ) : (
            <IntegrationJsonView elements={elements} clientId={clientId} />
          )
        )}
      </div>
    </div>
  );
}
