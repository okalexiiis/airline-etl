import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/auth.js';

export interface AuthenticatedRequest extends Request {
  session?: any;
  user?: any;
}

/**
 * Converts Express IncomingHttpHeaders to a Web standard Headers object.
 */
function getWebHeaders(req: Request): Headers {
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (value !== undefined && value !== null) {
      headers.append(key, String(value));
    }
  });
  return headers;
}

/**
 * Middleware that requires a valid authenticated session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: getWebHeaders(req),
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Access token or session is missing or expired.',
      });
      return;
    }

    (req as AuthenticatedRequest).session = session.session;
    (req as AuthenticatedRequest).user = session.user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication check.',
    });
  }
}

/**
 * Middleware that requires a session with the 'Admin' role.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: getWebHeaders(req),
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Access token or session is missing or expired.',
      });
      return;
    }

    if (session.user.role !== 'Admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Admin privilege is required to execute this operation.',
      });
      return;
    }

    (req as AuthenticatedRequest).session = session.session;
    (req as AuthenticatedRequest).user = session.user;
    next();
  } catch (error) {
    console.error('Authorization middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authorization check.',
    });
  }
}
