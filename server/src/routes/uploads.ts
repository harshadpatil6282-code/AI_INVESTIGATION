import { Router } from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import { uploadController } from '../controllers/uploadController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('UNSUPPORTED_FILE_TYPE'));
    }

    callback(null, true);
  },
});

const router = Router();
router.use(auth);
router.post('/:caseId', upload.single('file'), uploadController.uploadEvidence);

export default router;
