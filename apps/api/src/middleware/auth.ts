import { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { type Role, Errors } from '@nagrik-setu/shared';
import { authService, type AccessPayload, User } from '@nagrik-setu/domain';
import { getConfig } from '../config.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

/** Parse cookies before auth checks. */
export const parseCookies = cookieParser();

/** Require a valid access token. Attaches `req.user` with { sub, role }. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw Errors.unauthorized();
  }
  const payload = authService.verifyAccess(token, getConfig().JWT_ACCESS_SECRET);
  req.user = payload;
  next();
}

/** Restrict to specific roles. Must be used after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw Errors.unauthorized();
    }
    if (!roles.includes(req.user.role as Role)) {
      throw Errors.forbidden();
    }
    next();
  };
}

/**
 * Verify the authenticated user owns the resource.
 * Expects the resource owner ID to be at `req.params[paramName]` or resolved from the DB.
 */
export function requireOwner(paramName = 'userId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw Errors.unauthorized();
    }
    const ownerId = req.params[paramName];
    if (ownerId && req.user.sub !== ownerId) {
      throw Errors.forbidden('You do not own this resource');
    }
    next();
  };
}

/** Load the full user document from DB and attach to req. For routes that need department/ward info. */
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw Errors.unauthorized();
  }
  const user = await User.findById(req.user.sub);
  if (!user) {
    throw Errors.unauthorized('User not found');
  }
  // Attach the full user doc for downstream handlers
  (req as unknown as Record<string, unknown>)['fullUser'] = user;
  next();
}
