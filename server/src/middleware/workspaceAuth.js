import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const workspaceAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_WORKSPACE_ACCESS',
        message: 'Authentication required for server-managed workspace projects. Unauthenticated usage must remain in local browser draft mode.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_WORKSPACE_ACCESS',
        message: 'Authentication token missing. Cloud workspace operations require a valid user session.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        error: 'INVALID_WORKSPACE_TOKEN',
        message: 'Invalid or expired workspace authorization token.'
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status === 'suspended') {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_WORKSPACE_USER',
        message: 'Active user account not found or suspended.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Workspace authorization verification error'
    });
  }
};

export default workspaceAuth;
