import { useMemo } from "react";

export function SandboxViewer({ code = "", viewportWidth = "100%" }) {
  const compiledSrc = useMemo(() => {
    const raw = String(code || "").trim();
    if (!raw) {
      return "<!DOCTYPE html><html><body style='font-family:sans-serif;padding:24px;color:#71717a;'>No code provided for live execution.</body></html>";
    }

    if (raw.startsWith("<svg") || raw.includes("xmlns=\"http://www.w3.org/2000/svg\"")) {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;}</style></head><body>${raw}</body></html>`;
    }

    if (raw.toLowerCase().includes("<!doctype html") || raw.toLowerCase().includes("<html")) {
      if (!raw.includes("cdn.tailwindcss.com")) {
        return raw.replace(/<head[^>]*>/i, `$&<script src="https://cdn.tailwindcss.com"></script>`);
      }
      return raw;
    }

    const isOnlyScript = !raw.includes("<") && !raw.includes("</");
    const bodyContent = isOnlyScript ? `<script>${raw}</script>` : raw;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #09090b;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  }, [code]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-2 sm:p-4 overflow-auto">
      <iframe
        srcDoc={compiledSrc}
        sandbox="allow-scripts allow-modals"
        title="Interactive Web Sandbox"
        className="border-0 bg-white transition-all duration-300 rounded-md shadow-2xl h-full"
        style={{ width: viewportWidth || "100%", maxWidth: "100%" }}
      />
    </div>
  );
}

export default SandboxViewer;
