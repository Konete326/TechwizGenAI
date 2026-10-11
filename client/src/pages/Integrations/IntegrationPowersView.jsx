import React, { useState, useEffect } from 'react';
import { 
  Lightning, 
  Sparkle, 
  Check, 
  ArrowsClockwise, 
  Cpu, 
  FloppyDisk, 
  Info,
  MagicWand,
  Globe,
  Broadcast
} from '@phosphor-icons/react';
import { VITE_API_URL } from '@/config/env';
import { 
  getCategoryPowers, 
  detectAppProfileFromDom 
} from '@/utils/domClassifier';

export default function IntegrationPowersView({ clientId, app, onConfigUpdated }) {
  const [appName, setAppName] = useState(app?.appName || 'My Web Application');
  const [appCategory, setAppCategory] = useState(app?.appCategory || 'POS');
  const [customInstructions, setCustomInstructions] = useState(app?.customInstructions || '');
  const [powers, setPowers] = useState(app?.powers || {});
  const [domCount, setDomCount] = useState(app?.elementsCount || 0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [autoDetectedMeta, setAutoDetectedMeta] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    const loadConfigAndDom = async () => {
      setLoading(true);
      try {
        const [cfgRes, domRes] = await Promise.all([
          fetch(`${VITE_API_URL}/client/config/${clientId}`),
          fetch(`${VITE_API_URL}/client/dom/${clientId}`)
        ]);

        let loadedDom = [];
        if (domRes.ok) {
          const domJson = await domRes.json();
          if (domJson.success && Array.isArray(domJson.data)) {
            loadedDom = domJson.data;
            setDomCount(loadedDom.length);
          }
        }

        if (cfgRes.ok) {
          const cfgJson = await cfgRes.json();
          if (cfgJson.success && cfgJson.data) {
            const data = cfgJson.data;
            const currentName = data.appName;
            const currentCat = data.appCategory;
            
            if (currentName) setAppName(currentName);
            if (currentCat) setAppCategory(currentCat);
            if (data.customInstructions !== undefined) setCustomInstructions(data.customInstructions);
            if (data.powers) setPowers(data.powers);

            if (loadedDom.length > 0) {
              const detected = detectAppProfileFromDom(loadedDom, app?.domain || '');
              setAutoDetectedMeta(detected);
              if (!currentName || currentName === 'My Web Application') {
                if (detected.appName) setAppName(detected.appName);
              }
              if (!currentCat || currentCat === 'POS') {
                if (detected.appCategory) setAppCategory(detected.appCategory);
              }
            }
          }
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    loadConfigAndDom();
  }, [clientId, app?.domain]);

  const activeCategoryPowers = getCategoryPowers(appCategory);

  const togglePower = (key) => {
    setPowers(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }));
  };

  const handleAutoDetectFromDom = async () => {
    if (!clientId) return;
    setDetecting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${VITE_API_URL}/client/profile/detect/${clientId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const det = json.data;
          setAutoDetectedMeta(det);
          if (det.appName) setAppName(det.appName);
          if (det.appCategory) setAppCategory(det.appCategory);
          setFeedback(`Auto-detected from DOM: ${det.appCategory} System (${det.appName || 'Application'})`);
        } else {
          setFeedback('No active DOM elements available to auto-detect.');
        }
      } else {
        const domRes = await fetch(`${VITE_API_URL}/client/dom/${clientId}`);
        if (domRes.ok) {
          const domJson = await domRes.json();
          const loadedDom = domJson.data || [];
          if (loadedDom.length > 0) {
            const det = detectAppProfileFromDom(loadedDom, app?.domain || '');
            setAutoDetectedMeta(det);
            if (det.appName) setAppName(det.appName);
            if (det.appCategory) setAppCategory(det.appCategory);
            setFeedback(`Auto-detected: ${det.appCategory} (${det.appName || 'Application'})`);
          } else {
            setFeedback('No live DOM elements found. Ensure CDN/SDK is synced.');
          }
        }
      }
    } catch (err) {
      setFeedback('Error analyzing connected DOM.');
    } finally {
      setDetecting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${VITE_API_URL}/client/config/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          appCategory,
          powers,
          customInstructions
        })
      });
      if (res.ok) {
        const json = await res.json();
        setFeedback('Powers Saved Live! Automatically active in CDN/SDK.');
        if (onConfigUpdated) onConfigUpdated(json.data);
      } else {
        setFeedback('Failed to save powers. Please retry.');
      }
    } catch (err) {
      setFeedback('Network error while saving powers.');
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const enabledCount = activeCategoryPowers.filter(p => powers[p.key] !== false).length;

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-y-auto space-y-4 pr-1">
      <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0">
            <Lightning size={22} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">
                Nisa Dynamic Powers &amp; Capabilities
              </h2>
              {domCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live DOM Synced ({domCount})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface text-text-muted border border-border">
                  <Broadcast size={12} />
                  Waiting for CDN Sync
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted">
              Abilities dynamically adapt to your connected system type ({appCategory}). Disabled powers will be strictly rejected by Nisa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {feedback && (
            <span className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${
              feedback.includes('Saved') || feedback.includes('detected')
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}>
              {feedback.includes('Saved') || feedback.includes('detected') ? (
                <Check size={13} weight="bold" />
              ) : (
                <Info size={13} />
              )}
              <span>{feedback}</span>
            </span>
          )}

          <button
            onClick={handleAutoDetectFromDom}
            disabled={detecting || loading}
            title="Auto-fill App Name and Category using live connected DOM elements"
            className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border text-text-primary rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {detecting ? (
              <ArrowsClockwise size={14} className="animate-spin text-accent" />
            ) : (
              <MagicWand size={14} className="text-accent" weight="bold" />
            )}
            <span>{detecting ? 'Analyzing DOM...' : 'Auto-Detect from DOM'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            {saving ? (
              <ArrowsClockwise size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} weight="bold" />
            )}
            <span>{saving ? 'Updating Live...' : 'Save Powers'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <Cpu size={16} className="text-accent" />
              <span>Application Profile</span>
            </div>
            {autoDetectedMeta?.appCategory && (
              <span className="text-[11px] text-accent flex items-center gap-1 font-mono">
                <Sparkle size={12} weight="fill" />
                Detected: {autoDetectedMeta.appCategory}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted">Application Name</label>
              {autoDetectedMeta?.appName && appName === autoDetectedMeta.appName && (
                <span className="text-[10px] text-emerald-500 font-medium">Auto-filled from DOM</span>
              )}
            </div>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Apex POS Terminal, HubSpot CRM, Shopify Storefront"
              className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted">Deployment Category</label>
              <span className="text-[10px] text-text-muted font-mono">Controls Dynamic Powers</span>
            </div>
            <select
              value={appCategory}
              onChange={(e) => setAppCategory(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="POS">Point of Sale (POS) - Cashier, Retail, Cart &amp; Tenders</option>
              <option value="CRM">Customer Relationship Management (CRM) - Leads &amp; Pipelines</option>
              <option value="E-Commerce">E-Commerce &amp; Online Storefront</option>
              <option value="ERP">Enterprise Resource Planning (ERP) &amp; Warehouse</option>
              <option value="General">General Web Application</option>
            </select>
            <p className="text-[11px] text-text-muted">
              Nisa automatically configures {activeCategoryPowers.length} specialized power capabilities tailored for {appCategory} operations.
            </p>
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary border-b border-border pb-2">
            <Info size={16} className="text-accent" />
            <span>Custom Business Instructions &amp; Knowledge</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">
              System Rules &amp; Operational Constraints (Optional)
            </label>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Always confirm before applying discounts higher than 15%. Never close orders without asking for customer phone number. In this screen, the tender button is green."
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-mono"
            />
            <p className="text-[11px] text-text-muted">
              Any rules written here receive highest priority and are strictly enforced by Nisa during calls.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <Lightning size={16} className="text-accent" />
            <span>Active Power Capabilities ({appCategory} Specific)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-mono">
              {enabledCount} / {activeCategoryPowers.length} Enabled
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {activeCategoryPowers.map((def) => {
            const Icon = def.icon;
            const isEnabled = powers[def.key] !== false;

            return (
              <div
                key={def.key}
                onClick={() => togglePower(def.key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isEnabled
                    ? 'bg-surface border-accent/40 shadow-xs'
                    : 'bg-surface/40 border-border opacity-60 hover:opacity-85'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  isEnabled
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface border border-border text-text-muted'
                }`}>
                  <Icon size={18} weight={isEnabled ? 'bold' : 'regular'} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-primary leading-tight truncate">
                        {def.title}
                      </span>
                      {!isEnabled && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                          Disabled
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-pressed={isEnabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePower(def.key);
                      }}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-accent' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {def.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
