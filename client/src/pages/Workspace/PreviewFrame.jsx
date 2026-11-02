import React, { useState, useMemo } from 'react';
import {
  ArrowClockwise,
  Desktop,
  DeviceTablet,
  DeviceMobile,
  ShieldCheck,
  Browsers,
  Sparkle
} from '@phosphor-icons/react';
import { bundleFilesForPreview } from './workspaceUtils.js';

export function PreviewFrame({
  files,
  activeBuild = false,
  onTriggerBuild
}) {
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  const compiledHtml = useMemo(() => {
    return bundleFilesForPreview(files, { activeBuild });
  }, [files, activeBuild, refreshKey]);

  const getFrameWidth = () => {
    if (deviceMode === 'mobile') return '375px';
    if (deviceMode === 'tablet') return '768px';
    return '100%';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Browsers size={15} className="text-amber-400" />
          <span className="font-medium text-zinc-200">Sandbox Preview</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={11} /> Isolated
          </span>
          {activeBuild && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono animate-pulse">
              <Sparkle size={10} /> Active Construction
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTriggerBuild && (
            <button
              type="button"
              onClick={onTriggerBuild}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium flex items-center gap-1 transition-all"
              title="Add a sample UI element and trigger scoped cursor construction"
            >
              <Sparkle size={12} />
              <span>Build New Element</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'desktop' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Desktop View"
            >
              <Desktop size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'tablet' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tablet View (768px)"
            >
              <DeviceTablet size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1 rounded transition-colors ${
                deviceMode === 'mobile' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Mobile View (375px)"
            >
              <DeviceMobile size={14} />
            </button>
            <div className="w-[1px] h-3 bg-zinc-800 mx-0.5" />
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1 rounded text-zinc-500 hover:text-amber-400 transition-colors"
              title="Reload Preview"
            >
              <ArrowClockwise size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900/40 p-3 sm:p-4 flex items-center justify-center overflow-auto">
        <div
          className="h-full bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border border-zinc-800/80 flex flex-col"
          style={{ width: getFrameWidth(), maxWidth: '100%' }}
        >
          <iframe
            key={`${refreshKey}-${activeBuild ? 'active' : 'idle'}`}
            srcDoc={compiledHtml}
            sandbox="allow-scripts allow-modals"
            title="Isolated Preview Sandbox"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
