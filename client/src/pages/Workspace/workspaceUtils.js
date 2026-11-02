import { VITE_API_URL } from '@/config/env';
import { getPreviewConstructionScript } from './workspacePreviewEffect.js';

export const DEFAULT_TEMPLATE_FILES = [
  {
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nisa Web Application</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-zinc-950 text-white min-h-screen p-8 flex flex-col items-center justify-center">
  <div class="max-w-md w-full text-center space-y-4 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
    <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
      ✦ Nisa Workspace
    </div>
    <h1 class="text-2xl font-bold tracking-tight">Interactive Application</h1>
    <p class="text-sm text-zinc-400">Edit project files in the editor on the left to see live sandboxed preview updates.</p>
    <div class="pt-2">
      <button id="counter-btn" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all text-sm cursor-pointer shadow-md">
        Clicked 0 times
      </button>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
    mimeType: 'text/html'
  },
  {
    path: 'style.css',
    content: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}`,
    mimeType: 'text/css'
  },
  {
    path: 'app.js',
    content: `let count = 0;
const btn = document.getElementById('counter-btn');
if (btn) {
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = 'Clicked ' + count + ' times';
  });
}`,
    mimeType: 'text/javascript'
  }
];

const ALLOWED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.css', '.scss', '.sass', '.less',
  '.html', '.svg', '.md', '.markdown', '.txt',
  '.yaml', '.yml', '.env', '.toml', '.xml',
  '.gitignore', '.prettierrc', '.eslintrc'
]);

export const validateClientFilePath = (rawPath) => {
  if (typeof rawPath !== 'string') {
    throw new Error('File path must be a string');
  }

  const normalized = rawPath.replace(/\\/g, '/').trim();
  if (!normalized || normalized.length > 255) {
    throw new Error('File path is empty or exceeds 255 characters');
  }

  if (normalized.includes('\0') || normalized.includes('//')) {
    throw new Error('File path contains illegal characters or double slashes');
  }

  if (normalized.startsWith('/') || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error('Directory traversal or absolute paths are prohibited');
  }

  const parts = normalized.split('/');
  for (const part of parts) {
    if (part === '..' || part === '.') {
      throw new Error('Illegal path segments detected');
    }
    if (/[<>:"|?*]/.test(part)) {
      throw new Error(`File name "${part}" contains illegal characters`);
    }
  }

  const lastDot = normalized.lastIndexOf('.');
  const ext = lastDot !== -1 ? normalized.slice(lastDot).toLowerCase() : '';
  const basename = parts[parts.length - 1];

  const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
  const isAllowedDotfile = basename.startsWith('.') && ALLOWED_EXTENSIONS.has(basename);

  if (!isAllowedExt && !isAllowedDotfile) {
    throw new Error(`File extension "${ext}" is not permitted`);
  }

  return normalized;
};

export const smartMergeHtml = (currentHtml, newSnippet) => {
  if (!currentHtml || typeof currentHtml !== 'string') {
    return newSnippet;
  }

  let snippet = newSnippet.trim();
  if (snippet.includes('<!DOCTYPE') || snippet.includes('<html')) {
    return snippet;
  }

  if (!snippet.includes('data-nisa-new')) {
    snippet = snippet.replace(/^(\s*<[a-zA-Z0-9\-]+)([\s>])/i, '$1 data-nisa-new="true"$2');
  }

  const idMatch = snippet.match(/id=["']([^"']+)["']/i);
  if (idMatch && idMatch[1]) {
    const targetId = idMatch[1];
    const idRegex = new RegExp(`(<([a-zA-Z0-9\\-]+)[^>]*\\bid=["']${targetId}["'][^>]*>[\\s\\S]*?<\\/\\2>|<[a-zA-Z0-9\\-]+[^>]*\\bid=["']${targetId}["'][^>]*\\/>)`, 'i');
    if (idRegex.test(currentHtml)) {
      return currentHtml.replace(idRegex, snippet);
    }
  }

  const compMatch = snippet.match(/data-nisa-component=["']([^"']+)["']/i);
  if (compMatch && compMatch[1]) {
    const compName = compMatch[1];
    const compRegex = new RegExp(`(<([a-zA-Z0-9\\-]+)[^>]*\\bdata-nisa-component=["']${compName}["'][^>]*>[\\s\\S]*?<\\/\\2>)`, 'i');
    if (compRegex.test(currentHtml)) {
      return currentHtml.replace(compRegex, snippet);
    }
  }

  if (currentHtml.includes('<!-- nisa-mount -->')) {
    return currentHtml.replace('<!-- nisa-mount -->', `${snippet}\n  <!-- nisa-mount -->`);
  }

  if (currentHtml.includes('</div>\n  </div>')) {
    return currentHtml.replace('</div>\n  </div>', `  ${snippet}\n  </div>\n  </div>`);
  }

  if (currentHtml.includes('</main>')) {
    return currentHtml.replace('</main>', `  ${snippet}\n</main>`);
  }

  if (currentHtml.includes('</body>')) {
    return currentHtml.replace('</body>', `  ${snippet}\n</body>`);
  }

  return `${currentHtml}\n${snippet}`;
};

export const computeUpdatedFiles = (currentFiles, newSnippet, cleanPath) => {
  const list = Array.isArray(currentFiles) ? currentFiles : [];
  const isHtml = cleanPath.endsWith('.html') || cleanPath.endsWith('.htm');
  const existingIndex = list.findIndex((f) => f.path.toLowerCase() === cleanPath.toLowerCase());

  if (existingIndex === -1) {
    const lastDot = cleanPath.lastIndexOf('.');
    const ext = lastDot !== -1 ? cleanPath.slice(lastDot).toLowerCase() : '';
    const mimeType = ext === '.css' ? 'text/css' : (ext === '.js' || ext === '.jsx' ? 'text/javascript' : (isHtml ? 'text/html' : 'text/plain'));
    const newFile = {
      path: cleanPath,
      content: isHtml ? smartMergeHtml('', newSnippet) : newSnippet,
      mimeType,
      size: newSnippet.length
    };
    return [...list, newFile];
  }

  return list.map((f, i) => {
    if (i !== existingIndex) return f;
    const currentContent = f.content || '';
    const updatedContent = isHtml ? smartMergeHtml(currentContent, newSnippet) : `${currentContent.trim()}\n\n${newSnippet.trim()}\n`;
    return {
      ...f,
      content: updatedContent,
      size: updatedContent.length
    };
  });
};

export const bundleFilesForPreview = (files, options = {}) => {
  const activeBuild = Boolean(options.activeBuild);
  if (!Array.isArray(files) || files.length === 0) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;color:#a1a1aa;background:#09090b;text-align:center;">No project files to preview</body></html>`;
  }

  const fileMap = new Map();
  for (const f of files) {
    fileMap.set(f.path, f.content);
  }

  let html = fileMap.get('index.html') || fileMap.get('index.htm');
  if (!html) {
    for (const [p, c] of fileMap.entries()) {
      if (p.endsWith('.html')) {
        html = c;
        break;
      }
    }
  }

  const constructionScript = getPreviewConstructionScript(activeBuild);

  if (!html) {
    let combinedJs = '';
    let combinedCss = '';
    for (const [p, c] of fileMap.entries()) {
      if (p.endsWith('.css')) combinedCss += `\n${c}`;
      if (p.endsWith('.js') || p.endsWith('.jsx')) combinedJs += `\n${c}`;
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${combinedCss}</style>
</head>
<body class="bg-zinc-950 text-white min-h-screen p-6">
  <div id="root"></div>
  <script>${combinedJs}</script>
  ${constructionScript}
</body>
</html>`;
  }

  const cssRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  html = html.replace(cssRegex, (match, href) => {
    const cleanHref = href.replace(/^\.\//, '');
    if (fileMap.has(cleanHref)) {
      return `<style data-source="${cleanHref}">\n${fileMap.get(cleanHref)}\n</style>`;
    }
    return match;
  });

  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  html = html.replace(scriptRegex, (match, src) => {
    const cleanSrc = src.replace(/^\.\//, '');
    if (fileMap.has(cleanSrc)) {
      return `<script data-source="${cleanSrc}">\n${fileMap.get(cleanSrc)}\n</script>`;
    }
    return match;
  });

  if (activeBuild && constructionScript) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${constructionScript}\n</body>`);
    } else {
      html += constructionScript;
    }
  }

  return html;
};

const LOCAL_STORAGE_KEY = 'nisa_workspace_local_draft';

export const loadLocalDraft = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveLocalDraft = (draft) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString()
    }));
  } catch {}
};

export const clearLocalDraft = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {}
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${VITE_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};
