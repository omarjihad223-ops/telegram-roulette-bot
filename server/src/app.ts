import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import publicRoutes from './routes/public.routes';
import adminRoutes from './routes/admin.routes';
import { getPrizeImage } from './controllers/roulette.controller';
import { getShareImage } from './controllers/adminSystem.controller';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() }));

  // Deliberately outside miniAppAuth: <img> tags can't attach the X-Telegram-Init-Data
  // header, so this route (and the settings share-image one below) must stay public.
  app.get('/api/prizes/:key/image', getPrizeImage);
  app.get('/api/settings/share-image', getShareImage);

  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve the built Mini App (client/dist) as static files in production.
  //
  // Telegram's in-app WebView (and third-party Telegram clients especially) can cache
  // the Mini App page far more aggressively than normal browsers, sometimes ignoring
  // weak cache hints like `max-age=0`. Vite content-hashes every JS/CSS filename, so
  // those are 100% safe to cache forever — but index.html (which references those
  // hashed filenames) must NEVER be cached, or the client keeps loading an old build
  // that still points at old, possibly-deleted asset files.
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
