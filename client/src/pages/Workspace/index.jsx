import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SpinnerGap } from '@phosphor-icons/react';
import { FileTree } from './FileTree.jsx';
import { CodeEditor } from './CodeEditor.jsx';
import { PreviewFrame } from './PreviewFrame.jsx';
import { RevisionHistoryModal } from './RevisionHistoryModal.jsx';
import { NewProjectModal } from './NewProjectModal.jsx';
import { WorkspaceHeader } from './WorkspaceHeader.jsx';
import {
  DEFAULT_TEMPLATE_FILES,
  loadLocalDraft,
  saveLocalDraft,
  apiRequest,
  validateClientFilePath,
  smartMergeHtml,
  computeUpdatedFiles
} from './workspaceUtils.js';

export function Workspace() {
  const { projectId: routeProjectId } = useParams();

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [files, setFiles] = useState(DEFAULT_TEMPLATE_FILES);
  const [activeFilePath, setActiveFilePath] = useState('index.html');
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBuild, setActiveBuild] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const filesRef = useRef(files);

  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);
  const isLocalDraft = Boolean(activeProject?.isLocal);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const createLocalFallback = (name = 'Local Sandbox Draft', framework = 'vanilla') => ({
    _id: 'local_draft',
    name,
    framework,
    activeVersion: 1,
    totalRevisions: 1,
    isLocal: true,
    updatedAt: new Date().toISOString()
  });

  const loadProjects = useCallback(async () => {
    setActiveBuild(false);
    if (!isAuthenticated) {
      const local = loadLocalDraft();
      const localProj = createLocalFallback(local?.project?.name || 'Local Sandbox Project', local?.project?.framework);
      setProjects([localProj]);
      setActiveProject(localProj);
      const initialFiles = Array.isArray(local?.files) && local.files.length > 0 ? local.files : DEFAULT_TEMPLATE_FILES;
      setFiles(initialFiles);
      filesRef.current = initialFiles;
      setActiveFilePath(initialFiles[0]?.path || 'index.html');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest('/workspace/projects');
      const serverProjects = Array.isArray(res.projects) ? res.projects : [];
      const local = loadLocalDraft();
      const allProjects = [...serverProjects];

      if (local) {
        allProjects.push(createLocalFallback(local.project?.name || 'Local Browser Draft', local.project?.framework));
      }
      setProjects(allProjects);

      const target = (routeProjectId && allProjects.find((p) => p._id === routeProjectId || p.slug === routeProjectId)) || allProjects[0];
      if (target) {
        await selectProject(target);
      } else {
        await handleCreateFirstProject();
      }
    } catch (err) {
      showStatus(err.message || 'Failed to load cloud projects', 'error');
      const fallback = createLocalFallback();
      setProjects([fallback]);
      setActiveProject(fallback);
      setFiles(DEFAULT_TEMPLATE_FILES);
      filesRef.current = DEFAULT_TEMPLATE_FILES;
      setActiveFilePath('index.html');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, routeProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = async (project) => {
    setActiveBuild(false);
    setActiveProject(project);

    if (project.isLocal) {
      const draft = loadLocalDraft();
      const draftFiles = draft?.files?.length ? draft.files : DEFAULT_TEMPLATE_FILES;
      setFiles(draftFiles);
      filesRef.current = draftFiles;
      setActiveFilePath(draftFiles[0]?.path || 'index.html');
      setIsUnsaved(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiRequest(`/workspace/projects/${project._id}/latest`);
      const revFiles = data.revision?.files?.length ? data.revision.files : DEFAULT_TEMPLATE_FILES;
      setFiles(revFiles);
      filesRef.current = revFiles;
      setActiveFilePath(revFiles[0]?.path || 'index.html');
      if (data.project) setActiveProject(data.project);
      setIsUnsaved(false);
    } catch (err) {
      showStatus(err.message || 'Failed to load project files', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFirstProject = async () => {
    setActiveBuild(false);
    if (!isAuthenticated) return;
    try {
      const res = await apiRequest('/workspace/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'My Nisa Project',
          description: 'Primary Nisa Workspace',
          framework: 'react',
          initialFiles: DEFAULT_TEMPLATE_FILES
        })
      });
      if (res.project) {
        setProjects([res.project]);
        setActiveProject(res.project);
        setFiles(DEFAULT_TEMPLATE_FILES);
        filesRef.current = DEFAULT_TEMPLATE_FILES;
        setActiveFilePath('index.html');
      }
    } catch {
      const fallback = createLocalFallback();
      setProjects([fallback]);
      setActiveProject(fallback);
      setFiles(DEFAULT_TEMPLATE_FILES);
      filesRef.current = DEFAULT_TEMPLATE_FILES;
    }
  };

  const handleCreateNewProject = async ({ name, slug, description, framework }) => {
    setActiveBuild(false);
    if (!isAuthenticated) {
      const newLocal = { ...createLocalFallback(name, framework), slug, description };
      saveLocalDraft({ project: newLocal, files: DEFAULT_TEMPLATE_FILES });
      setProjects([newLocal]);
      setActiveProject(newLocal);
      setFiles(DEFAULT_TEMPLATE_FILES);
      filesRef.current = DEFAULT_TEMPLATE_FILES;
      setActiveFilePath('index.html');
      setIsUnsaved(false);
      showStatus('Local draft workspace created (offline-only)', 'success');
      return;
    }

    const res = await apiRequest('/workspace/projects', {
      method: 'POST',
      body: JSON.stringify({ name, slug, description, framework, initialFiles: DEFAULT_TEMPLATE_FILES })
    });

    if (res.project) {
      setProjects((prev) => [res.project, ...prev.filter((p) => p._id !== res.project._id)]);
      setActiveProject(res.project);
      setFiles(DEFAULT_TEMPLATE_FILES);
      filesRef.current = DEFAULT_TEMPLATE_FILES;
      setActiveFilePath('index.html');
      setIsUnsaved(false);
      showStatus(`Created workspace: ${res.project.name}`, 'success');
    }
  };

  const handleFileContentChange = (newContent) => {
    const nextFiles = filesRef.current.map((f) => (f.path === activeFilePath ? { ...f, content: newContent } : f));
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    setIsUnsaved(true);
  };

  const handleCreateFile = (filePath) => {
    try {
      const cleanPath = validateClientFilePath(filePath);
      const ext = cleanPath.split('.').pop() || 'txt';
      const newFile = {
        path: cleanPath,
        content: ext === 'html' ? '<!DOCTYPE html>\n<html><body></body></html>' : '',
        mimeType: ext === 'css' ? 'text/css' : ext === 'js' ? 'text/javascript' : 'text/plain'
      };
      const nextFiles = [...filesRef.current, newFile];
      filesRef.current = nextFiles;
      setFiles(nextFiles);
      setActiveFilePath(cleanPath);
      setIsUnsaved(true);
    } catch (err) {
      showStatus(err.message, 'error');
    }
  };

  const handleDeleteFile = (filePath) => {
    const nextFiles = filesRef.current.filter((f) => f.path !== filePath);
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    if (activeFilePath === filePath && nextFiles.length > 0) setActiveFilePath(nextFiles[0].path);
    setIsUnsaved(true);
  };

  const executeSaveSnapshot = async (snapshotFiles, summaryText) => {
    if (!activeProject?._id || !isAuthenticated) return;

    isSavingRef.current = true;
    setIsSaving(true);
    showStatus('Saving durable cloud revision...', 'info');

    try {
      const nextVersion = (activeProject.activeVersion || 0) + 1;
      const res = await apiRequest(`/workspace/projects/${activeProject._id}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({
          files: snapshotFiles.map((f) => ({ path: f.path, content: f.content, size: f.size, mimeType: f.mimeType })),
          summary: summaryText || `Revision ${nextVersion}`
        })
      });

      if (res.success && res.project) {
        setActiveProject((p) => ({
          ...p,
          activeVersion: res.project.activeVersion,
          totalRevisions: res.project.totalRevisions,
          updatedAt: res.project.updatedAt
        }));
        setProjects((prev) => prev.map((p) => (p._id === res.project.id ? { ...p, ...res.project } : p)));
        setIsUnsaved(false);
        showStatus(`Saved durable revision v${res.project.activeVersion}`, 'success');
      } else {
        setIsUnsaved(true);
        showStatus('Cloud save completed with unexpected response. Draft kept locally.', 'info');
      }
    } catch (err) {
      setIsUnsaved(true);
      showStatus(`Cloud save failed: ${err.message}. Draft preserved locally — click "Save Revision" to retry.`, 'error');
    } finally {
      if (pendingSaveRef.current) {
        const queued = pendingSaveRef.current;
        pendingSaveRef.current = null;
        executeSaveSnapshot(queued.snapshot, queued.summary);
      } else {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    }
  };

  const handleSaveSnapshot = async () => {
    if (isSavingRef.current) {
      showStatus('A save operation is currently in progress', 'info');
      return;
    }

    const currentFiles = filesRef.current || files;

    if (isLocalDraft) {
      saveLocalDraft({ project: activeProject, files: currentFiles });
      setIsUnsaved(false);
      showStatus('Draft saved locally in browser storage', 'success');
      return;
    }

    if (!isAuthenticated) {
      showStatus('Sign in required to save cloud revisions. Draft kept locally.', 'error');
      return;
    }

    await executeSaveSnapshot(currentFiles);
  };

  const handleRestoreRevision = async (targetVersion) => {
    setActiveBuild(false);
    if (isLocalDraft) {
      showStatus('Revisions are only available on cloud-persisted projects', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiRequest(`/workspace/projects/${activeProject._id}/revisions/${targetVersion}/restore`, { method: 'POST' });
      if (res.success) {
        const latest = await apiRequest(`/workspace/projects/${activeProject._id}/latest`);
        if (latest.revision?.files) {
          setFiles(latest.revision.files);
          filesRef.current = latest.revision.files;
          setActiveFilePath(latest.revision.files[0]?.path || 'index.html');
        }
        if (latest.project) setActiveProject(latest.project);
        setIsUnsaved(false);
        showStatus(`Restored v${targetVersion} as new revision v${res.revision?.version || latest.project?.activeVersion}`, 'success');
      }
    } catch (err) {
      showStatus(err.message || 'Failed to restore revision', 'error');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const applyBuildChange = useCallback((newSnippet, targetFilePath = 'index.html', options = {}) => {
    if (!newSnippet || typeof newSnippet !== 'string') {
      showStatus('Build snippet cannot be empty', 'error');
      return;
    }

    let cleanPath = 'index.html';
    try {
      cleanPath = validateClientFilePath(targetFilePath || 'index.html');
    } catch (err) {
      showStatus(`Invalid path: ${err.message}`, 'error');
      return;
    }

    const currentFiles = filesRef.current || files;
    const deterministicSnapshot = computeUpdatedFiles(currentFiles, newSnippet, cleanPath);

    filesRef.current = deterministicSnapshot;
    setFiles(deterministicSnapshot);
    setActiveFilePath(cleanPath);
    setActiveBuild(true);
    setTimeout(() => setActiveBuild(false), 3500);

    saveLocalDraft({ project: activeProject, files: deterministicSnapshot });

    if (isLocalDraft || !isAuthenticated || !activeProject?._id) {
      setIsUnsaved(false);
      showStatus(`Build applied & saved to local draft: ${cleanPath}`, 'success');
      return;
    }

    const summaryText = options.summary || `Build revision: ${cleanPath}`;

    if (isSavingRef.current) {
      pendingSaveRef.current = { snapshot: deterministicSnapshot, summary: summaryText };
      setIsUnsaved(true);
      showStatus('Build applied to editor. Cloud save is in progress, queued for next snapshot...', 'info');
      return;
    }

    executeSaveSnapshot(deterministicSnapshot, summaryText);
  }, [activeProject, isLocalDraft, isAuthenticated]);

  const handleTriggerActiveBuild = useCallback(() => {
    const timestamp = Date.now().toString().slice(-4);
    const newComponentSnippet = `<div id="nisa-sample-component" data-nisa-new="true" class="p-3 bg-zinc-800/80 border border-amber-500/30 rounded-xl text-left space-y-1 shadow-sm mt-3">
  <div class="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
    <span>✦ Live AI Component #${timestamp}</span>
  </div>
  <p class="text-[11px] text-zinc-400">Scoped cursor construction demonstrated on newly created node.</p>
</div>`;
    applyBuildChange(newComponentSnippet, 'index.html');
  }, [applyBuildChange]);

  useEffect(() => {
    window.NisaWorkspace = {
      applyBuildChange,
      triggerSampleBuild: handleTriggerActiveBuild,
      getState: () => ({ activeProject, isLocalDraft, isUnsaved, isSaving, activeBuild, filesCount: files.length, activeFilePath })
    };
    return () => {
      delete window.NisaWorkspace;
    };
  }, [applyBuildChange, handleTriggerActiveBuild, activeProject, isLocalDraft, isUnsaved, isSaving, activeBuild, files.length, activeFilePath]);

  const activeFile = useMemo(() => files.find((f) => f.path === activeFilePath) || files[0] || null, [files, activeFilePath]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden select-none">
      <WorkspaceHeader
        activeProject={activeProject}
        projects={projects}
        isLocalDraft={isLocalDraft}
        statusMessage={statusMessage}
        isSaving={isSaving}
        isUnsaved={isUnsaved}
        onSelectProject={selectProject}
        onOpenNewModal={() => setIsNewModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onSaveSnapshot={handleSaveSnapshot}
      />

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
          <SpinnerGap size={28} className="animate-spin text-amber-400" />
          <span className="text-xs">Loading workspace...</span>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <FileTree
            files={files}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
          />

          <CodeEditor
            activeFile={activeFile}
            onChangeContent={handleFileContentChange}
            isUnsaved={isUnsaved}
            onApplyBuild={applyBuildChange}
          />

          <PreviewFrame
            files={files}
            activeBuild={activeBuild}
            onTriggerBuild={handleTriggerActiveBuild}
          />
        </div>
      )}

      <RevisionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        projectId={activeProject?._id}
        currentVersion={activeProject?.activeVersion || 1}
        onRestoreRevision={handleRestoreRevision}
      />

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreateProject={handleCreateNewProject}
      />
    </div>
  );
}

export default Workspace;
