import 'dotenv/config';
import net from 'node:net';

function getConfiguredPort() {
  const value = Number(process.env.PORT ?? 5000);
  return Number.isInteger(value) && value > 0 ? value : 5000;
}

const configuredOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: getConfiguredPort(),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGODB_URI ?? '',
  origin: process.env.CLIENT_ORIGIN ? configuredOrigins : true,
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  dailyUser: Number(process.env.DAILY_CASE_QUOTA_USER ?? 5),
  dailyGuest: Number(process.env.DAILY_CASE_QUOTA_GUEST ?? 2),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024),
  allowedUploadTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'application/json'],
};

export async function getAvailablePort(desiredPort = env.port): Promise<number> {
  let port = desiredPort;
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const isFree = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();
      tester.once('error', () => resolve(false));
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });

      try {
        tester.listen({ port, host: '::', exclusive: true });
      } catch {
        resolve(false);
      }
    });

    if (isFree) return port;
    port += 1;
  }

  return desiredPort;
}
