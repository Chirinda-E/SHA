import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { clientDistDir } from './utils/paths.js';
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import productRoutes from './routes/products.js';
import recordRoutes from './routes/records.js';
import chatRoutes from './routes/chat.js';
import reportRoutes from './routes/reports.js';
import { requireAuth } from './middleware/auth.js';
import { upgrade } from './controllers/authController.js';
import { resetDemo } from './controllers/demoController.js';

function corsOrigins() {
  const raw = env.clientOrigin || '';
  if (raw === '*' || raw === 'true') return true;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'data:'],
              manifestSrc: ["'self'"],
              workerSrc: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'SHA - Smart Hustle Assistant' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/business', businessRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api', recordRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reports', reportRoutes);
  app.post('/api/plan/upgrade', requireAuth, upgrade);
  app.post('/api/demo/reset', requireAuth, resetDemo);

  const dist = clientDistDir();
  if (dist) {
    app.use(express.static(dist, { index: false, maxAge: isProd ? '1h' : 0 }));
    app.get(/^(?!\/api).*/, (req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
