import * as fs from 'node:fs';
import * as path from 'node:path';

import { appDataSource } from '../../../config/database';
import { logger } from '../../../config/logger';
import { ExportJob } from '../../../entities/ExportJob';

export async function processNextExportJob(): Promise<void> {
  const exportRepo = appDataSource.getRepository(ExportJob);

  // Find next pending job
  const job = await exportRepo.findOne({
    where: { status: 'PENDING' },
    order: { createdAt: 'ASC' },
  });

  if (!job) return;

  logger.info({ jobId: job.id, type: job.exportType }, 'Processing export job');

  job.status = 'RUNNING';
  job.startedAt = new Date();
  job.progress = 10;
  await exportRepo.save(job);

  try {
    // 1. Resolve records based on type
    let data: any[] = [];
    if (job.exportType === 'tenders') {
      data = await appDataSource.query(`
        SELECT id, title, slug, budget, category_id, status, created_at
        FROM tenders
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else if (job.exportType === 'users') {
      data = await appDataSource.query(`
        SELECT id, email, first_name, last_name, account_type, is_active, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else if (job.exportType === 'financial') {
      data = await appDataSource.query(`
        SELECT id, amount_cents, currency, status, type, reference_id, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else {
      // General fall-back metrics
      data = await appDataSource.query(`
        SELECT *
        FROM tender_daily_metrics
        ORDER BY date DESC
        LIMIT 5000
      `);
    }

    job.progress = 50;
    await exportRepo.save(job);

    if (data.length === 0) {
      throw new Error('No data found to export');
    }

    // 2. Generate CSV String
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const stringVal = (val === null ?? val === undefined) ? '' : String(val);
        // Escape quotes
        return `"${stringVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    job.progress = 80;
    await exportRepo.save(job);

    // 3. Write file locally
    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `export-${job.exportType}-${job.id}.csv`;
    const filePath = path.join(exportDir, filename);
    fs.writeFileSync(filePath, csvRows.join('\n'), 'utf8');

    // In a real S3 scenario, upload to S3 here. For local server, serve from dynamic url endpoint.
    job.fileUrl = `/api/v1/analytics/exports/download/${filename}`;
    job.status = 'COMPLETED';
    job.progress = 100;
    job.finishedAt = new Date();
    await exportRepo.save(job);

    logger.info({ jobId: job.id }, 'Export job completed successfully');
  } catch (err: any) {
    logger.error({ err, jobId: job.id }, 'Export job failed');
    job.status = 'FAILED';
    job.progress = 100;
    job.finishedAt = new Date();
    job.errorMessage = err?.message ?? 'Unknown error occurred during export';
    await exportRepo.save(job);
  }
}

export async function cleanupExpiredExportFiles(): Promise<void> {
  logger.info('Cleaning up expired export files');
  const exportRepo = appDataSource.getRepository(ExportJob);
  const now = new Date();

  try {
    const expiredJobs = await exportRepo.find({
      where: { status: 'COMPLETED' },
    });

    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');

    for (const job of expiredJobs) {
      if (job.expiresAt < now) {
        // Delete local file if it exists
        if (job.fileUrl) {
          const filename = job.fileUrl.split('/').pop();
          if (filename) {
            const filePath = path.join(exportDir, filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
        // Mark database status
        job.status = 'EXPIRED';
        await exportRepo.save(job);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Cleanup of expired export files failed');
  }
}
