import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import * as cron from 'node-cron';

import { logger } from '../config/logger';
import { runWithContext } from '../config/requestContext';

type JobName =
  | 'expire_tenders'
  | 'expire_subscriptions'
  | 'alert_digest'
  | 'deadline_reminders'
  | 'publish_scheduled_tenders'
  | 'retry_failed_notifications'
  | 'virus_scanning'
  | 'export_generation'
  | 'cleanup_expired_invitations'
  | 'daily_analytics_rollup'
  | 'analytics_retention_cleanup'
  | 'async_exports_processor'
  | 'expired_exports_cleanup'
  | 'scheduled_reports_dispatcher'
  | 'daily_audit_archival'
  | 'async_audit_exports_processor'
  | 'security_alert_scanner';

/**
 * CronManager — singleton that manages all scheduled jobs.
 *
 * Only runs on PM2 cluster worker 0 (checked in server.ts).
 * All other workers skip job registration entirely.
 *
 * Admin API can call start/stop/getStatus for runtime control.
 */
export class CronManager {
  private static instance: CronManager;
  private readonly tasks: Map<JobName, cron.ScheduledTask> = new Map();
  private readonly running: Map<JobName, boolean> = new Map();

  static getInstance(): CronManager {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!CronManager.instance) CronManager.instance = new CronManager();
    return CronManager.instance;
  }

  register(name: JobName, schedule: string, fn: () => Promise<void> | void): void {
    if (this.tasks.has(name)) return; // Already registered

    const task = cron.schedule(
      schedule,
      async () => {
        const traceId = randomUUID();
        const requestId = traceId;
        await runWithContext({ traceId, requestId }, async () => {
          logger.info({ jobName: name, status: 'starting' }, 'Cron job starting');
          const start = performance.now();
          try {
            await fn();
            const durationMs = performance.now() - start;
            logger.info({ jobName: name, status: 'completed', durationMs }, 'Cron job completed');
          } catch (err) {
            const durationMs = performance.now() - start;
            logger.error({ err, jobName: name, status: 'failed', durationMs }, 'Cron job failed');
          }
        });
      },
      { timezone: 'UTC', scheduled: false },
    );

    this.tasks.set(name, task);
    this.running.set(name, false);
  }

  start(name: JobName): void {
    this.tasks.get(name)?.start();
    this.running.set(name, true);
    logger.info({ jobName: name, status: 'started' }, 'Cron job started');
  }

  stop(name: JobName): void {
    this.tasks.get(name)?.stop();
    this.running.set(name, false);
    logger.info({ jobName: name, status: 'stopped' }, 'Cron job stopped');
  }

  startAll(): void {
    this.tasks.forEach((_, name) => this.start(name));
    logger.info({ status: 'all_started' }, 'All cron jobs started');
  }

  stopAll(): void {
    this.tasks.forEach((_, name) => this.stop(name));
    logger.info('All cron jobs stopped');
  }

  getStatus(): Record<JobName, boolean> {
    const out: Record<string, boolean> = {};
    this.running.forEach((isRunning, name) => {
      out[name] = isRunning;
    });
    return out;
  }
}
