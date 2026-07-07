import { logger } from '../config/logger';

/**
 * Send Alert Digest Job — Phase 2 placeholder.
 * Will send daily/weekly email digests of new tenders to users with alert preferences.
 * Runs daily at 8:00 AM UTC.
 *
 * Implementation requirements (Phase 2):
 *   - Find users with AlertPreference rows where frequency = 'daily' or 'weekly'
 *   - For each user, query tenders matching their category/state/keyword filters
 *     created since their last digest was sent
 *   - Batch max 500 users per run — paginate if more
 *   - Send digest via email.service.ts
 *   - Track last sent timestamp per AlertPreference row
 */
export async function sendAlertDigestJob(): Promise<void> {
  logger.info('Alert digest job: Phase 2 feature — not yet implemented');
}
