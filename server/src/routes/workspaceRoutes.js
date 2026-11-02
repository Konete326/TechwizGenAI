import { Router } from 'express';
import { workspaceAuth } from '../middleware/workspaceAuth.js';
import {
  listProjects,
  createProject,
  getProject,
  getLatestSnapshot,
  saveSnapshot,
  getRevisionHistory,
  getSnapshotByVersion,
  restoreRevision
} from '../controllers/workspaceController.js';

const router = Router();

router.use(workspaceAuth);

router.get('/projects', listProjects);
router.post('/projects', createProject);
router.get('/projects/:projectId', getProject);
router.get('/projects/:projectId/latest', getLatestSnapshot);
router.post('/projects/:projectId/snapshots', saveSnapshot);
router.get('/projects/:projectId/revisions', getRevisionHistory);
router.get('/projects/:projectId/revisions/:version', getSnapshotByVersion);
router.post('/projects/:projectId/revisions/:version/restore', restoreRevision);

export default router;

