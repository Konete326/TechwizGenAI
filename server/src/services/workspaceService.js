import crypto from 'crypto';
import path from 'path';
import { WorkspaceProject } from '../models/WorkspaceProject.js';
import { WorkspaceRevision } from '../models/WorkspaceRevision.js';

const MAX_FILES = 500;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 8 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.css', '.scss', '.sass', '.less',
  '.html', '.svg', '.md', '.markdown', '.txt',
  '.yaml', '.yml', '.env', '.toml', '.xml',
  '.gitignore', '.prettierrc', '.eslintrc'
]);

const MIME_MAP = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.jsx': 'text/jsx',
  '.ts': 'text/typescript',
  '.tsx': 'text/tsx',
  '.json': 'application/json',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-scss',
  '.less': 'text/x-less',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.txt': 'text/plain'
};

const resolveMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'text/plain';
};

const sanitizePath = (rawPath) => {
  if (typeof rawPath !== 'string') return null;
  const normalized = rawPath.replace(/\\/g, '/').trim();
  if (!normalized || normalized.length > 255) return null;
  if (normalized.includes('\0') || normalized.includes('//')) return null;
  if (normalized.startsWith('/') || normalized.startsWith('../') || normalized.includes('/../')) return null;

  const parts = normalized.split('/');
  for (const part of parts) {
    if (part === '..' || part === '.') return null;
    if (/[<>:"|?*]/.test(part)) return null;
  }

  const ext = path.extname(normalized).toLowerCase();
  const basename = path.basename(normalized);
  const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);
  const isAllowedDotfile = basename.startsWith('.') && ALLOWED_EXTENSIONS.has(basename);

  if (!isAllowedExt && !isAllowedDotfile) {
    return null;
  }

  return normalized;
};

export const validateWorkspaceFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Workspace payload must contain a non-empty array of files');
  }

  if (files.length > MAX_FILES) {
    throw new Error(`Workspace file count exceeds maximum limit of ${MAX_FILES} files`);
  }

  const seenPaths = new Set();
  const sanitizedList = [];
  let totalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || typeof file !== 'object') {
      throw new Error(`Invalid file entry at index ${i}`);
    }

    const cleanPath = sanitizePath(file.path);
    if (!cleanPath) {
      throw new Error(`Invalid, unsafe, or unsupported file path at index ${i}: "${file.path}"`);
    }

    if (seenPaths.has(cleanPath)) {
      throw new Error(`Duplicate file path detected: "${cleanPath}"`);
    }
    seenPaths.add(cleanPath);

    if (typeof file.content !== 'string') {
      throw new Error(`File content for "${cleanPath}" must be a string`);
    }

    const byteSize = Buffer.byteLength(file.content, 'utf8');
    if (byteSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File "${cleanPath}" size (${byteSize} bytes) exceeds maximum limit of 1MB`);
    }

    totalSize += byteSize;
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      throw new Error(`Total workspace snapshot size exceeds maximum limit of 8MB`);
    }

    sanitizedList.push({
      path: cleanPath,
      content: file.content,
      size: byteSize,
      mimeType: resolveMimeType(cleanPath)
    });
  }

  sanitizedList.sort((a, b) => a.path.localeCompare(b.path));

  const hash = crypto.createHash('sha256');
  for (const item of sanitizedList) {
    hash.update(`${item.path}:${item.content}\n`);
  }
  const sourceHash = hash.digest('hex');

  return {
    files: sanitizedList,
    filesCount: sanitizedList.length,
    totalSize,
    sourceHash
  };
};

export const createProject = async ({ name, description, framework, initialFiles, userId, clientId }) => {
  if (!userId) {
    throw new Error('Authenticated user required to create a cloud workspace project');
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new Error('Project name is required');
  }

  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug}-${crypto.randomBytes(4).toString('hex')}`;

  const project = new WorkspaceProject({
    name: name.trim().slice(0, 100),
    slug,
    description: (description || '').trim().slice(0, 500),
    userId,
    clientId: typeof clientId === 'string' && clientId.trim() ? clientId.trim() : null,
    framework: framework || 'react'
  });

  await project.save();

  if (Array.isArray(initialFiles) && initialFiles.length > 0) {
    await saveSnapshot({
      projectId: project._id,
      userId,
      files: initialFiles,
      summary: 'Initial project setup',
      user: { _id: userId }
    });
  }

  return project;
};

export const getProject = async ({ projectId, userId }) => {
  if (!projectId || !userId) {
    throw new Error('projectId and authenticated userId are required');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  return project;
};

export const listProjects = async ({ userId, page = 1, limit = 20 }) => {
  if (!userId) {
    throw new Error('Authenticated userId is required to list projects');
  }

  const query = { userId, status: 'active' };
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [projects, total] = await Promise.all([
    WorkspaceProject.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    WorkspaceProject.countDocuments(query)
  ]);

  return {
    projects,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

export const saveSnapshot = async ({ projectId, userId, files, summary, user }) => {
  if (!projectId || !userId) {
    throw new Error('projectId and authenticated userId are required');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  const validation = validateWorkspaceFiles(files);

  const updatedProject = await WorkspaceProject.findOneAndUpdate(
    { _id: project._id, userId },
    {
      $inc: { activeVersion: 1, totalRevisions: 1 },
      $set: { updatedAt: new Date() }
    },
    { new: true }
  );

  const newVersion = updatedProject.activeVersion;

  const revision = new WorkspaceRevision({
    projectId: updatedProject._id,
    clientId: updatedProject.clientId,
    version: newVersion,
    summary: (summary || `Revision ${newVersion}`).trim().slice(0, 300),
    files: validation.files,
    filesCount: validation.filesCount,
    totalSize: validation.totalSize,
    sourceHash: validation.sourceHash,
    createdBy: user ? { id: user._id, name: user.name, email: user.email } : null
  });

  await revision.save();

  return {
    project: {
      id: updatedProject._id,
      name: updatedProject.name,
      activeVersion: updatedProject.activeVersion,
      totalRevisions: updatedProject.totalRevisions,
      updatedAt: updatedProject.updatedAt
    },
    revision: {
      id: revision._id,
      version: revision.version,
      summary: revision.summary,
      filesCount: revision.filesCount,
      totalSize: revision.totalSize,
      sourceHash: revision.sourceHash,
      createdAt: revision.createdAt,
      createdBy: revision.createdBy
    }
  };
};

export const getLatestSnapshot = async ({ projectId, userId }) => {
  if (!projectId || !userId) {
    throw new Error('projectId and authenticated userId are required');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  const latestRevision = await WorkspaceRevision.findOne({ projectId: project._id })
    .sort({ version: -1 });

  return {
    project,
    revision: latestRevision || null
  };
};

export const getRevisionHistory = async ({ projectId, userId, page = 1, limit = 20 }) => {
  if (!projectId || !userId) {
    throw new Error('projectId and authenticated userId are required');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [revisions, totalCount] = await Promise.all([
    WorkspaceRevision.find({ projectId: project._id })
      .select('-files')
      .sort({ version: -1 })
      .skip(skip)
      .limit(limitNum),
    WorkspaceRevision.countDocuments({ projectId: project._id })
  ]);

  return {
    project: {
      id: project._id,
      name: project.name,
      activeVersion: project.activeVersion,
      totalRevisions: project.totalRevisions
    },
    revisions,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum)
    }
  };
};

export const getSnapshotByVersion = async ({ projectId, userId, version }) => {
  if (!projectId || !userId || version === undefined) {
    throw new Error('projectId, authenticated userId and version are required');
  }

  const versionNum = parseInt(version, 10);
  if (isNaN(versionNum) || versionNum < 1) {
    throw new Error('Version must be a positive integer');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  const revision = await WorkspaceRevision.findOne({
    projectId: project._id,
    version: versionNum
  });

  if (!revision) {
    throw new Error(`Revision ${versionNum} not found for this project`);
  }

  return {
    project,
    revision
  };
};

export const restoreRevision = async ({ projectId, userId, targetVersion, user }) => {
  if (!projectId || !userId || targetVersion === undefined) {
    throw new Error('projectId, authenticated userId and targetVersion are required');
  }

  const versionNum = parseInt(targetVersion, 10);
  if (isNaN(versionNum) || versionNum < 1) {
    throw new Error('Target version must be a positive integer');
  }

  const project = await WorkspaceProject.findOne({
    _id: projectId,
    userId,
    status: { $ne: 'archived' }
  });

  if (!project) {
    throw new Error('Project not found or access denied');
  }

  const targetRevision = await WorkspaceRevision.findOne({
    projectId: project._id,
    version: versionNum
  });

  if (!targetRevision) {
    throw new Error(`Target revision ${versionNum} not found`);
  }

  const clonedFiles = targetRevision.files.map((f) => ({
    path: f.path,
    content: f.content,
    size: f.size,
    mimeType: f.mimeType
  }));

  return saveSnapshot({
    projectId: project._id,
    userId,
    files: clonedFiles,
    summary: `Restored from revision ${versionNum}`,
    user
  });
};

export default {
  validateWorkspaceFiles,
  createProject,
  saveSnapshot,
  restoreRevision,
  getLatestSnapshot,
  getRevisionHistory,
  getSnapshotByVersion,
  listProjects,
  getProject
};
