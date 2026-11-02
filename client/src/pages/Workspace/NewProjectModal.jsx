import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkle,
  SpinnerGap,
  Browsers,
  Code,
  Lightning,
  Atom
} from '@phosphor-icons/react';

const FRAMEWORK_OPTIONS = [
  {
    id: 'react',
    name: 'React 19',
    badge: 'Component-based',
    icon: Atom,
    desc: 'Interactive UI with JSX and reactive state'
  },
  {
    id: 'vanilla',
    name: 'Vanilla Web',
    badge: 'Zero-config',
    icon: Code,
    desc: 'Lightweight HTML5, modern CSS3 & JavaScript'
  },
  {
    id: 'vite',
    name: 'Vite App',
    badge: 'Fast HMR',
    icon: Lightning,
    desc: 'Next-generation modern frontend tooling'
  },
  {
    id: 'next',
    name: 'Next.js',
    badge: 'Full-stack',
    icon: Browsers,
    desc: 'Server-rendered React web architecture'
  }
];

export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('react');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateSlug = (val) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Workspace name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onCreateProject({
        name: name.trim(),
        slug: slug.trim() || generateSlug(name.trim()),
        description: description.trim(),
        framework
      });
      setName('');
      setSlug('');
      setDescription('');
      setFramework('react');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 w-96 h-48 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15),transparent_70%)] blur-2xl"
        />

        <div className="relative flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Browsers size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Create a workspace</h2>
              <p className="text-xs text-zinc-400">Set up an isolated project workspace for Nisa AI builds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Workspace Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Luxury Atelier Storefront"
              value={name}
              onChange={handleNameChange}
              className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-amber-400 transition-colors placeholder:text-zinc-600 shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Workspace Slug</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/90 shadow-xs focus-within:border-amber-400">
              <span className="bg-zinc-800/70 border-r border-zinc-800 text-zinc-400 px-3 py-2 text-xs flex items-center font-mono select-none">
                nisa.app/
              </span>
              <input
                type="text"
                placeholder="luxury-atelier"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                className="w-full px-3 py-2 bg-transparent text-xs text-amber-300 font-mono outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Select Framework Starter</label>
            <div className="grid grid-cols-2 gap-2">
              {FRAMEWORK_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = framework === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setFramework(opt.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
                        : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <IconComponent
                          size={16}
                          className={isSelected ? 'text-amber-400' : 'text-zinc-400'}
                        />
                        <span className={`text-xs font-medium ${isSelected ? 'text-amber-300' : 'text-zinc-200'}`}>
                          {opt.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief summary of this project workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-amber-400 transition-colors resize-none placeholder:text-zinc-600 shadow-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <SpinnerGap size={14} className="animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <Plus size={14} weight="bold" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProjectModal;
