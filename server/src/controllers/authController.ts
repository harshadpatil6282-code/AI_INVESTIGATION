import type { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import type { AuthRequest } from '../middleware/auth.js';

const tokenForUser = (id: string) =>
  jwt.sign({ sub: id }, env.accessSecret, { expiresIn: '15m' });

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(40),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authController = {
  async guest(_req: AuthRequest, res: Response) {
    const user = await User.create({
      displayName: 'Guest Detective',
      isGuest: true,
    });

    res.status(201).json({
      token: tokenForUser(String(user._id)),
      user: {
        id: user.id,
        displayName: user.displayName,
        isGuest: true,
      },
    });
  },

  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = registerSchema.parse(req.body);
      const user = await User.create({
        email: payload.email,
        displayName: payload.displayName,
        passwordHash: await bcrypt.hash(payload.password, 12),
      });

      res.status(201).json({
        token: tokenForUser(user.id),
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = loginSchema.parse(req.body);
      const user = await User.findOne({ email: payload.email });

      if (!user || !(await bcrypt.compare(payload.password, user.passwordHash ?? ''))) {
        return res.status(401).json({
          error: {
            code: 'INVALID_LOGIN',
            message: 'Invalid email or password',
          },
        });
      }

      return res.json({
        token: tokenForUser(user.id),
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isGuest: !!user.isGuest,
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  async me(req: AuthRequest, res: Response) {
    const user = await User.findById(req.userId);

    res.json({
      id: user?.id,
      email: user?.email,
      displayName: user?.displayName,
      isGuest: user?.isGuest,
      stats: user?.stats,
    });
  },
};
