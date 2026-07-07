import { logger } from '../config/logger';

/**
 * Deadline Reminders Job — Phase 2 placeholder.
 * Will send email reminders to subscribed users for tenders expiring within 48 hours.
 * Runs daily at 9:00 AM UTC.
 *
 * Implementation requirements (Phase 2):
 *   - Find ACTIVE tenders with deadline between now and now + 48 hours
 *   - Find users with SavedTender rows for those tenders
 *   - Send one reminder email per tender per user (dedup via DownloadHistory or cache)
 *   - Include tender title, agency, deadline, and a link to the platform
 */
export async function deadlineRemindersJob(): Promise<void> {
  logger.info('Deadline reminders job: Phase 2 feature — not yet implemented');
}
