import { CronManager } from './CronManager';
import { expireTendersJob } from './expireTenders.job';
import { expireSubscriptionsJob } from './expireSubscriptions.job';
import { sendAlertDigestJob } from './sendAlertDigest.job';
import { deadlineRemindersJob } from './deadlineReminders.job';
import { publishTendersJob } from './publishTenders.job';
import { retryNotificationsJob } from './retryNotifications.job';
import { virusScanningJob } from './virusScanning.job';
import { exportGenerationJob } from './exportGeneration.job';
import { cleanupInvitationsJob } from './cleanupInvitations.job';
import { runDailyRollups, cleanupAnalyticsData } from '../modules/analytics/jobs/rollup.job';
import { processNextExportJob, cleanupExpiredExportFiles } from '../modules/analytics/jobs/export.job';
import { processScheduledReports } from '../modules/analytics/reports/reports.job';
import { runAuditArchival, processAuditExports, runSecurityAlertScanner } from '../modules/audit/jobs';

/**
 * Registers all cron jobs and starts them.
 * ONLY called on PM2 worker 0 (checked in server.ts).
 */
export function startCronJobs(): void {
  const manager = CronManager.getInstance();

  manager.register('expire_tenders', '0 * * * *', expireTendersJob);
  manager.register('expire_subscriptions', '0 * * * *', expireSubscriptionsJob);
  manager.register('alert_digest', '0 8 * * *', sendAlertDigestJob);
  manager.register('deadline_reminders', '0 9 * * *', deadlineRemindersJob);
  manager.register('publish_scheduled_tenders', '0 * * * *', publishTendersJob);
  manager.register('retry_failed_notifications', '0 * * * *', retryNotificationsJob);
  manager.register('virus_scanning', '*/5 * * * *', virusScanningJob);
  manager.register('export_generation', '0 0 * * *', exportGenerationJob);
  manager.register('cleanup_expired_invitations', '0 1 * * *', cleanupInvitationsJob);

  // BI Analytics background workers
  manager.register('daily_analytics_rollup', '5 0 * * *', () => runDailyRollups(new Date()));
  manager.register('analytics_retention_cleanup', '15 0 * * *', cleanupAnalyticsData);
  manager.register('async_exports_processor', '*/1 * * * *', processNextExportJob);
  manager.register('expired_exports_cleanup', '0 * * * *', cleanupExpiredExportFiles);
  manager.register('scheduled_reports_dispatcher', '0 * * * *', processScheduledReports);

  // Audit Logs background workers
  manager.register('daily_audit_archival', '20 0 * * *', runAuditArchival);
  manager.register('async_audit_exports_processor', '*/1 * * * *', processAuditExports);
  manager.register('security_alert_scanner', '*/5 * * * *', runSecurityAlertScanner);

  manager.startAll();
}
