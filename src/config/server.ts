import { performance } from 'node:perf_hooks';

import { startCronJobs } from '../jobs';

import { app } from './app';
import { AppDataSource } from './database';
import { env } from './env';
import { logger } from './logger';

import { setupNotificationListeners } from '@/modules/notifications/services/notifications.service';

import 'reflect-metadata';

const startTime = performance.now();

// Catch unhandled errors early — log and exit (PM2 will restart)
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — restarting');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — restarting');
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  logger.info(
    {
      env: env.NODE_ENV,
      port: env.PORT,
      nodeVersion: process.version,
    },
    'Application starting',
  );

  // ── Step 1: Connect to database ─────────────────────────────────────────────
  try {
    await AppDataSource.initialize();
    logger.info('Database connected');

    // Initialize real-time notification listener bindings
    setupNotificationListeners();
  } catch (err) {
    logger.error({ err }, 'Database connection failed — shutting down');
    process.exit(1);
  }

  // ── Step 2: Start cron jobs (worker 0 only) ─────────────────────────────────
  const instanceId = process.env['NODE_APP_INSTANCE'];
  if (instanceId === '0' || instanceId === undefined) {
    // undefined = running outside PM2 cluster (dev/fork mode) — run cron here too
    startCronJobs();
    logger.info({ instanceId: instanceId ?? 'dev' }, 'Cron jobs started on this worker');
  } else {
    logger.info({ instanceId }, 'Cron skipped — not worker 0');
  }

  // ── Step 3: Start HTTP server ───────────────────────────────────────────────
  const port = env.PORT;
  app.listen(port, () => {
    logger.info('Ready');
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    const durationMs = performance.now() - startTime;
    logger.info({ reason: signal, durationMs }, 'Application shutting down');
    try {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

void bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});
