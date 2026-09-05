import { useRef, useEffect, useState, memo } from "react";
import mermaid from "mermaid";
import { DownloadSimple, SidebarSimple, GitFork, ArrowRight, Code } from "@phosphor-icons/react";
import { DashboardChart } from "./DashboardChart";
import { parseChartFromText } from "./chartParser";
import { sanitizeMermaid, aggressiveCleanMermaid, parseFallbackNodes } from "./mermaidSanitizer";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
  suppressErrorRendering: true
});

const svgCache = new Map();

export const MermaidChart = memo(function MermaidChart({ chart, onOpenArtifact, isStreaming }) {
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showRawCode, setShowRawCode] = useState(false);
  const parsedChart = parseChartFromText(chart);
  const fallbackNodes = failed ? parseFallbackNodes(chart) : [];

  useEffect(() => {
    if (parsedChart || isStreaming) return;
    let active = true;
    const raw = (chart || "").trim();
    if (!raw) return;

    if (svgCache.has(raw)) {
      if (containerRef.current) containerRef.current.innerHTML = svgCache.get(raw);
      setRendered(true);
      setFailed(false);
      return;
    }

    const applySvg = (markup) => {
      if (!active || !containerRef.current) return false;
      svgCache.set(raw, markup);
      containerRef.current.innerHTML = markup;
      const el = containerRef.current.querySelector("svg");
      if (el) { el.style.maxWidth = "100%"; el.style.height = "auto"; }
      setRendered(true);
      setFailed(false);
      return true;
    };

    const renderDiagram = async () => {
      const id1 = `mmd-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      try {
        const { svg } = await mermaid.render(id1, sanitizeMermaid(raw));
        if (applySvg(svg)) return;
      } catch {
        document.querySelectorAll(`[id^="${id1}"], [id^="d${id1}"]`).forEach((el) => el.remove());
      }

      const id2 = `mmd2-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      try {
        const { svg } = await mermaid.render(id2, aggressiveCleanMermaid(raw));
        if (applySvg(svg)) return;
      } catch {
        document.querySelectorAll(`[id^="${id2}"], [id^="d${id2}"], [id^="dmmd-"], [id^="dmermaid"]`).forEach((el) => el.remove());
        if (!active) return;
        setFailed(true);
        setRendered(false);
      }
    };

    renderDiagram();
    return () => {
      active = false;
      document.querySelectorAll('[id^="dmmd-"], [id^="dmermaid"]').forEach((el) => el.remove());
    };
  }, [chart, parsedChart, isStreaming]);

  const handleDownload = (e) => {
    e.stopPropagation();
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `diagram-${Date.now()}.svg` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (parsedChart) {
    return <DashboardChart type={parsedChart.type} title={parsedChart.title} data={parsedChart.data} />;
  }

  if (isStreaming) {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-border bg-surface-card flex items-center gap-2.5 text-xs text-text-muted font-mono animate-pulse">
        <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping" />
        <span>Compiling diagram...</span>
      </div>
    );
  }

  if (failed && !rendered) {
    return (
      <div className="my-3 rounded-xl border border-border bg-surface-card p-3 sm:p-4 text-xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-accent/10 text-accent"><GitFork size={14} weight="bold" /></div>
            <span className="font-semibold text-text-primary text-xs">System Architecture Flow</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRawCode((p) => !p)}
            className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-accent transition-colors px-2 py-0.5 rounded hover:bg-surface"
          >
            <Code size={12} /><span>{showRawCode ? "Hide Syntax" : "View Syntax"}</span>
          </button>
        </div>

        {fallbackNodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 py-2">
            {fallbackNodes.map((n, i) => (
              <div key={n.id || i} className="flex items-center gap-2">
                <div className="px-2.5 py-1.5 rounded-lg border border-accent/30 bg-accent/5 text-text-primary font-medium shadow-xs">{n.label}</div>
                {i < fallbackNodes.length - 1 && <ArrowRight size={14} className="text-text-muted shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {showRawCode && (
          <pre className="mt-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto">
            <code>{chart}</code>
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="relative group my-3 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden w-full max-w-full min-w-0">
      {rendered && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {onOpenArtifact && (
            <button
              type="button"
              onClick={() => onOpenArtifact({ type: "mermaid", content: chart })}
              className="p-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 shadow transition-colors cursor-pointer"
              title="Open in Panel"
            ><SidebarSimple size={14} weight="bold" /></button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 shadow transition-colors cursor-pointer"
            title="Download Diagram (SVG)"
            aria-label="Download diagram"
          ><DownloadSimple size={14} weight="bold" /></button>
        </div>
      )}
      <div ref={containerRef} className="p-4 overflow-x-auto flex justify-center text-xs w-full max-w-full min-w-0 [&>svg]:max-w-full [&>svg]:h-auto" />
    </div>
  );
});

export default MermaidChart;
