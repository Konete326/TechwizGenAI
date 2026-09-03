import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import { DownloadSimple } from "@phosphor-icons/react";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

function MermaidChart({ chart }) {
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !chart) return;
    const id = "mermaid-" + Math.random().toString(36).substring(2, 9);
    mermaid.render(id, chart)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      })
      .catch(() => {
        if (containerRef.current) {
          containerRef.current.innerText = chart;
          setRendered(false);
        }
      });
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

  return (
    <div className="relative group my-3 bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {rendered && (
        <div className="absolute top-2 right-2 z-10">
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
        className="p-4 overflow-x-auto flex justify-center text-xs"
      />
    </div>
  );
}

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-zinc-200">{children}</p>,
  h1: ({ children }) => <h1 className="font-bold text-zinc-100 mt-4 mb-2 text-base">{children}</h1>,
  h2: ({ children }) => <h2 className="font-semibold text-zinc-100 mt-3 mb-1.5 text-sm">{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold text-zinc-100 mt-3 mb-1.5 text-xs">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-200 text-xs">{children}</li>,
  code: ({ inline, className, children, ...props }) => {
    if (className && className.includes("language-mermaid")) {
      return <MermaidChart chart={String(children).replace(/\n$/, "")} />;
    }
    return (
      <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => {
    if (children?.props?.className?.includes("language-mermaid")) {
      return children;
    }
    return (
      <pre className="bg-zinc-950 p-3.5 rounded-lg overflow-x-auto text-xs font-mono my-2.5 border border-zinc-800 text-zinc-300" {...props}>
        {children}
      </pre>
    );
  },
  a: ({ href, children }) => (
    <a href={href} className="text-blue-400 hover:underline cursor-pointer" target="_blank" rel="noreferrer">
      {children}
    </a>
  )
};

export function MarkdownRenderer({ content }) {
  return (
    <div className="text-xs leading-relaxed break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
