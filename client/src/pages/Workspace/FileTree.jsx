import React, { useState, useMemo } from 'react';
import {
  FileCode,
  FileHtml,
  FileCss,
  FileText,
  FilePlus,
  Trash,
  FolderOpen,
  Folder,
  CaretRight,
  CaretDown,
  Check,
  X,
  MagnifyingGlass
} from '@phosphor-icons/react';

const getFileIcon = (filePath) => {
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
    return <FileHtml size={15} className="text-amber-400 shrink-0" />;
  }
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
    return <FileCss size={15} className="text-sky-400 shrink-0" />;
  }
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    return <FileCode size={15} className="text-emerald-400 shrink-0" />;
  }
  return <FileText size={15} className="text-zinc-400 shrink-0" />;
};

const buildTreeStructure = (files) => {
  const root = { name: 'root', type: 'folder', children: {}, files: [] };

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 1) {
      root.files.push(file);
    } else {
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        if (!current.children[folderName]) {
          current.children[folderName] = {
            name: folderName,
            type: 'folder',
            children: {},
            files: []
          };
        }
        current = current.children[folderName];
      }
      current.files.push(file);
    }
  });

  return root;
};

export function FileTree({
  files,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState({});

  const toggleFolder = (folderPath) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFileName('');
    setErrorMsg('');
  };

  const handleConfirmCreate = () => {
    const trimmed = newFileName.trim().replace(/^\/+/, '');
    if (!trimmed) {
      setErrorMsg('File name cannot be empty');
      return;
    }
    if (files.some((f) => f.path.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('File already exists');
      return;
    }
    onCreateFile(trimmed);
    setIsCreating(false);
    setNewFileName('');
    setErrorMsg('');
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewFileName('');
    setErrorMsg('');
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const tree = useMemo(() => {
    return buildTreeStructure(filteredFiles);
  }, [filteredFiles]);

  const renderFolderNode = (node, currentPath = '', level = 0) => {
    const folderPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    const isCollapsed = Boolean(collapsedFolders[folderPath]);

    return (
      <div key={folderPath} className="space-y-0.5">
        <div
          onClick={() => toggleFolder(folderPath)}
          style={{ paddingLeft: `${Math.max(6, level * 14)}px` }}
          className="flex items-center gap-1.5 py-1 px-2 rounded text-xs cursor-pointer text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors select-none group"
        >
          {isCollapsed ? (
            <CaretRight size={12} className="text-zinc-500 group-hover:text-zinc-300" />
          ) : (
            <CaretDown size={12} className="text-zinc-500 group-hover:text-zinc-300" />
          )}
          {isCollapsed ? (
            <Folder size={15} className="text-amber-500/80" />
          ) : (
            <FolderOpen size={15} className="text-amber-400" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </div>

        {!isCollapsed && (
          <div className="border-l border-zinc-800/80 ml-3.5 space-y-0.5">
            {Object.values(node.children).map((childFolder) =>
              renderFolderNode(childFolder, folderPath, level + 1)
            )}
            {node.files.map((file) => renderFileNode(file, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFileNode = (file, level = 0) => {
    const isActive = file.path === activeFilePath;
    const fileName = file.path.split('/').pop() || file.path;

    return (
      <div
        key={file.path}
        onClick={() => onSelectFile(file.path)}
        style={{ paddingLeft: `${Math.max(6, level * 14)}px` }}
        className={`group flex items-center justify-between py-1 px-2 rounded text-xs cursor-pointer transition-colors ${
          isActive
            ? 'bg-amber-500/15 text-amber-300 font-medium border border-amber-500/30 shadow-xs'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {getFileIcon(file.path)}
          <span className="truncate">{fileName}</span>
        </div>
        {files.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(file.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 rounded transition-opacity"
            title="Delete file"
          >
            <Trash size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-r border-zinc-800/80 text-zinc-300 w-64 shrink-0 select-none">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <FolderOpen size={16} className="text-amber-400" />
          <span>Explorer</span>
        </div>
        <button
          type="button"
          onClick={handleStartCreate}
          className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60 rounded transition-colors"
          title="New File"
        >
          <FilePlus size={16} />
        </button>
      </div>

      <div className="px-2.5 py-2 border-b border-zinc-900">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-400 focus-within:border-amber-500/50">
          <MagnifyingGlass size={13} className="text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-zinc-200 text-xs placeholder:text-zinc-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isCreating && (
          <div className="p-2 mb-1.5 bg-zinc-900/90 border border-amber-500/40 rounded-lg text-xs space-y-1.5 shadow-lg">
            <input
              type="text"
              autoFocus
              placeholder="e.g. src/Button.jsx"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreate();
                if (e.key === 'Escape') handleCancelCreate();
              }}
              className="w-full bg-zinc-950 border border-zinc-700 px-2 py-1 rounded text-white text-xs outline-none focus:border-amber-400"
            />
            {errorMsg && <p className="text-[10px] text-rose-400">{errorMsg}</p>}
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-2 py-0.5 hover:bg-zinc-800 text-zinc-400 rounded text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded font-medium text-[11px]"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {Object.values(tree.children).map((folder) => renderFolderNode(folder))}
        {tree.files.map((file) => renderFileNode(file))}

        {filteredFiles.length === 0 && (
          <div className="py-6 text-center text-xs text-zinc-600">
            No matching files
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex justify-between items-center bg-zinc-950">
        <span>{files.length} {files.length === 1 ? 'file' : 'files'}</span>
        <span>
          {Math.round(files.reduce((acc, f) => acc + (f.content?.length || 0), 0) / 1024)} KB
        </span>
      </div>
    </div>
  );
}

export default FileTree;
