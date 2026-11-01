import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { ensureOwnedCase } from '../services/caseAccess.js';

const validMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
]);

const uploadBodySchema = z.object({
  caseId: z.string().min(1),
});

export const uploadController = {
  async uploadEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parsed = uploadBodySchema.safeParse({ caseId: req.params.caseId });
      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CASE_ID',
            message: 'Case identifier is missing or invalid.',
          },
        });
      }

      const caseDoc = await ensureOwnedCase(String(req.userId), parsed.data.caseId);
      if (!caseDoc) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Case not found or not accessible.',
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'A file upload is required.',
          },
        });
      }

      if (!validMimeTypes.has(req.file.mimetype)) {
        return res.status(415).json({
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: 'This file type is not allowed.',
          },
        });
      }

      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Files must be under 2MB.',
          },
        });
      }

      const fileId = randomUUID();
      return res.status(201).json({
        file: {
          id: fileId,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          caseId: caseDoc.id,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
};
