import { useRef, useEffect, useState } from "react";
import mermaid from "mermaid";
import { DownloadSimple, SidebarSimple } from "@phosphor-icons/react";
import { DashboardChart } from "./DashboardChart";
import { parseChartFromText } from "./chartParser";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
  suppressErrorRendering: true
});

export function MermaidChart({ chart, onOpenArtifact }) {
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const parsedChart = parseChartFromText(chart);

  useEffect(() => {
    if (parsedChart) return;
    let active = true;
    const clean = (chart || "").trim();
    if (!clean) return;

    const render = async () => {
      try {
        await mermaid.parse(clean);
        if (!active) return;
        const id = "mmd-" + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, clean);
        if (!active || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          svgEl.style.maxWidth = "100%";
          svgEl.style.height = "auto";
        }
        setRendered(true);
        setFailed(false);
      } catch {
        if (!active) return;
        setFailed(true);
        setRendered(false);
      } finally {
        document.querySelectorAll('[id^="dmmd-"], [id^="dmermaid"]').forEach((el) => el.remove());
      }
    };

    render();
    return () => {
      active = false;
      document.querySelectorAll('[id^="dmmd-"], [id^="dmermaid"]').forEach((el) => el.remove());
    };
  }, [chart]);

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (parsedChart) {
    return <DashboardChart type={parsedChart.type} title={parsedChart.title} data={parsedChart.data} />;
  }

  if (failed && !rendered) {
    return (
      <pre className="bg-zinc-950 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2 border border-zinc-800 text-zinc-300 min-w-0 max-w-full">
        <code>{chart}</code>
      </pre>
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
            >
              <SidebarSimple size={14} weight="bold" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 shadow transition-colors cursor-pointer"
            title="Download Diagram (SVG)"
            aria-label="Download diagram"
          >
            <DownloadSimple size={14} weight="bold" />
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="p-4 overflow-x-auto flex justify-center text-xs w-full max-w-full min-w-0 [&>svg]:max-w-full [&>svg]:h-auto"
      />
    </div>
  );
}

export default MermaidChart;
