import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import caseRoutes from './routes/cases.js';
import uploadRoutes from './routes/uploads.js';

const app = express();
const generalLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth requests. Please slow down.' } },
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Upload limit exceeded. Try again later.' } },
});

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use((req, _res, next) => {
  console.info(`${req.method} ${req.path}`);
  next();
});
app.use(generalLimiter);

app.get('/health', (_req, res) =>
  res.json({ ok: true, provider: env.geminiKey ? 'gemini' : 'mock' }),
);

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/uploads', uploadLimiter, uploadRoutes);
app.use('/api/v1/cases', caseRoutes);

app.use((err: any, req: any, res: any, _next: any) => {
  const statusCode =
    err?.name === 'ZodError'
      ? 400
      : err?.code === 'LIMIT_FILE_SIZE'
        ? 413
        : err?.code === 'LIMIT_UNEXPECTED_FILE'
          ? 400
          : err?.code === 'UNSUPPORTED_FILE_TYPE'
            ? 415
            : err?.code === 11000
              ? 409
              : 500;

  const message =
    err?.name === 'ZodError'
      ? err.issues.map((issue: any) => issue.message).join(', ')
      : err?.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large.'
        : err?.code === 'UNSUPPORTED_FILE_TYPE'
          ? 'Unsupported file type.'
          : err?.code === 11000
            ? 'That email is already registered.'
            : 'Something went wrong.';

  console.error('[api-error]', {
    method: req.method,
    path: req.path,
    statusCode,
    message: err?.message ?? message,
    stack: env.nodeEnv === 'development' ? err?.stack : undefined,
  });

  return res.status(statusCode).json({
    error: {
      code: err?.name === 'ZodError' ? 'VALIDATION_ERROR' : err?.code ?? 'INTERNAL_ERROR',
      message,
    },
  });
});

async function start() {
  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri);
  } else {
    console.warn('MONGODB_URI is empty; configure MongoDB before creating cases.');
  }

  let port = env.port;

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`API listening on ${port}`);
          resolve();
        });

        server.once('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is busy; falling back to ${port + 1}.`);
            reject(error);
            return;
          }
          reject(error);
        });
      });
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EADDRINUSE') {
        throw error;
      }
      port += 1;
    }
  }
}

void start();

export default app;
