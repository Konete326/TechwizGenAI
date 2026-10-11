import React, { useState, useEffect } from 'react';
import { 
  Lightning, 
  Sparkle, 
  Check, 
  ArrowsClockwise, 
  CursorClick, 
  Textbox, 
  Compass, 
  ChatCircleText, 
  Eye, 
  Cpu, 
  FloppyDisk, 
  Info 
} from '@phosphor-icons/react';
import { VITE_API_URL } from '@/config/env';

export default function IntegrationPowersView({ clientId, app, onConfigUpdated }) {
  const [appName, setAppName] = useState(app?.appName || 'My Web Application');
  const [appCategory, setAppCategory] = useState(app?.appCategory || 'POS');
  const [customInstructions, setCustomInstructions] = useState(app?.customInstructions || '');
  const [powers, setPowers] = useState({
    autoCapture: true,
    selfLearning: true,
    formFilling: true,
    navigation: true,
    dynamicModals: true,
    spotlightGuidance: true,
    ...(app?.powers || {})
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    const loadConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${VITE_API_URL}/client/config/${clientId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.appName) setAppName(json.data.appName);
            if (json.data.appCategory) setAppCategory(json.data.appCategory);
            if (json.data.customInstructions !== undefined) setCustomInstructions(json.data.customInstructions);
            if (json.data.powers) setPowers(prev => ({ ...prev, ...json.data.powers }));
          }
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [clientId]);

  const togglePower = (key) => {
    setPowers(prev => ({ ...prev, [key]: !prev[key] }));
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

  const powerDefinitions = [
    {
      key: 'autoCapture',
      title: 'Autonomous Universal Auto-Capture',
      desc: 'Automatically scans, classifies, and indexes every actionable button, input, link, and interactive control when the host page loads or changes routes.',
      icon: CursorClick,
      color: 'emerald'
    },
    {
      key: 'selfLearning',
      title: 'Interactive Learn-by-Demonstration (Self-Learning UI)',
      desc: 'Observes user manual clicks on unmapped controls, adds them to persistent memory, and verbally acknowledges comprehension to the user.',
      icon: Sparkle,
      color: 'amber'
    },
    {
      key: 'formFilling',
      title: 'Ambient Form & Search Autofill',
      desc: 'Enables Nisa to fill out input forms, change dropdowns, type queries into search bars, and update textareas via voice dictation.',
      icon: Textbox,
      color: 'blue'
    },
    {
      key: 'navigation',
      title: 'Cross-Page & Route Navigation',
      desc: 'Empowers Nisa to navigate between URLs, SPA routes, tabs, and dashboard views on voice request.',
      icon: Compass,
      color: 'purple'
    },
    {
      key: 'dynamicModals',
      title: 'Dynamic Floating Modals & Notes',
      desc: 'Allows Nisa to present floating rich-text notes, translation cards, and confirmation dialogues on top of the host screen.',
      icon: ChatCircleText,
      color: 'sky'
    },
    {
      key: 'spotlightGuidance',
      title: 'Visual Spotlight & Ripple Guidance',
      desc: 'Directs the user visually by smoothly scrolling to target controls and illuminating them with a pulsating highlight ring.',
      icon: Eye,
      color: 'indigo'
    }
  ];

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-y-auto space-y-4 pr-1">
      <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
            <Lightning size={22} weight="fill" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              Nisa Dynamic Powers &amp; Capabilities
            </h2>
            <p className="text-xs text-text-muted">
              Configure Nisa&apos;s active abilities here. Changes apply instantly to your embedded CDN/SDK without editing client code.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {feedback && (
            <span className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${
              feedback.includes('Saved')
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}>
              {feedback.includes('Saved') ? <Check size={13} weight="bold" /> : <Info size={13} />}
              <span>{feedback}</span>
            </span>
          )}

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
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary border-b border-border pb-2">
            <Cpu size={16} className="text-accent" />
            <span>Application Profile</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Application Name</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. POS Terminal #1 or CRM Dashboard"
              className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Deployment Category</label>
            <select
              value={appCategory}
              onChange={(e) => setAppCategory(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="POS">Point of Sale (POS) - Cashier, Retail, Orders</option>
              <option value="CRM">Customer Relationship Management (CRM) - Leads, Pipeline</option>
              <option value="E-Commerce">E-Commerce &amp; Retail Storefront</option>
              <option value="ERP">Enterprise ERP &amp; Operations</option>
              <option value="General">General Web Application</option>
            </select>
            <p className="text-[11px] text-text-muted">
              Nisa automatically tunes her domain vocabulary and conversation style for {appCategory}.
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
              System Rules &amp; Button Hints (Optional)
            </label>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. In this POS, the cart checkout button is in the lower right corner. Cash payments should be confirmed before proceeding."
              className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-mono"
            />
            <p className="text-[11px] text-text-muted">
              These guidelines are streamed directly to Nisa&apos;s live brain on every user call.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <Lightning size={16} className="text-accent" />
            <span>Active Power Capabilities</span>
          </div>
          <span className="text-[11px] text-text-muted font-mono">
            {Object.values(powers).filter(Boolean).length} / {powerDefinitions.length} Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {powerDefinitions.map((def) => {
            const Icon = def.icon;
            const isEnabled = powers[def.key] !== false;

            return (
              <div
                key={def.key}
                onClick={() => togglePower(def.key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isEnabled
                    ? 'bg-surface border-accent/40 shadow-xs'
                    : 'bg-surface/50 border-border opacity-60 hover:opacity-80'
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
                    <span className="text-xs font-bold text-text-primary leading-tight">
                      {def.title}
                    </span>
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
