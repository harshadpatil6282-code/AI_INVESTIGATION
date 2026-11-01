import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const bearerToken = req.headers.authorization;
  const token = bearerToken?.startsWith('Bearer ') ? bearerToken.slice(7).trim() : undefined;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } });
  }

  try {
    const payload = jwt.verify(token, env.accessSecret) as { sub?: string };
    if (!payload.sub) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token missing subject.' } });
    }

    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid.' } });
  }
}
