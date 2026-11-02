import workspaceService from '../services/workspaceService.js';

export const listProjects = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userId = req.user._id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const result = await workspaceService.listProjects({
      userId,
      page,
      limit
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { name, description, framework, initialFiles, clientId } = req.body;
    const userId = req.user._id;

    const project = await workspaceService.createProject({
      name,
      description,
      framework,
      initialFiles,
      userId,
      clientId
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getProject = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId } = req.params;
    const userId = req.user._id;

    const project = await workspaceService.getProject({
      projectId,
      userId
    });

    res.json({ success: true, project });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const getLatestSnapshot = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId } = req.params;
    const userId = req.user._id;

    const data = await workspaceService.getLatestSnapshot({
      projectId,
      userId
    });

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const saveSnapshot = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId } = req.params;
    const { files, summary } = req.body;
    const userId = req.user._id;

    const result = await workspaceService.saveSnapshot({
      projectId,
      userId,
      files,
      summary,
      user: req.user
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getRevisionHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId } = req.params;
    const userId = req.user._id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const result = await workspaceService.getRevisionHistory({
      projectId,
      userId,
      page,
      limit
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const getSnapshotByVersion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId, version } = req.params;
    const userId = req.user._id;

    const result = await workspaceService.getSnapshotByVersion({
      projectId,
      userId,
      version
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const restoreRevision = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const { projectId, version } = req.params;
    const userId = req.user._id;

    const result = await workspaceService.restoreRevision({
      projectId,
      userId,
      targetVersion: version,
      user: req.user
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  listProjects,
  createProject,
  getProject,
  getLatestSnapshot,
  saveSnapshot,
  getRevisionHistory,
  getSnapshotByVersion,
  restoreRevision
};
