import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { createApp } from './app';
import { createBot } from './bot';
import { startExpirationWorker } from './workers/expiration.worker';

async function main() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  createBot();
  startExpirationWorker();

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
