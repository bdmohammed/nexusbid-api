import * as fs from 'node:fs';
import * as path from 'node:path';

import { IsNull, Not } from 'typeorm';

import { AppDataSource } from '../../../config/database';
import { logger } from '../../../config/logger';
import { ExportJob } from '../../../database/entities/ExportJob';

import { ExportJobStatus, ExportJobType } from '@/types/enums';

export async function processNextExportJob(): Promise<void> {
  const exportRepo = AppDataSource.getRepository(ExportJob);

  // Find next pending job
  const job = await exportRepo.findOne({
    where: [
      { status: ExportJobStatus.PENDING, queueName: IsNull() },
      { status: ExportJobStatus.PENDING, queueName: Not('audit') },
    ],
    order: { createdAt: 'ASC' },
  });

  if (!job) return;

  logger.info({ jobId: job.id, type: job.exportType }, 'Processing export job');

  job.status = ExportJobStatus.RUNNING;
  job.startedAt = new Date();
  job.progress = 10;
  await exportRepo.save(job);

  try {
    // 1. Resolve records based on type
    let data: Record<string, string | number | boolean | Date | null>[] = [];
    if (job.exportType === ExportJobType.TENDER) {
      data = await AppDataSource.query(`
        SELECT id, title, slug, budget, category_id, status, created_at
        FROM tenders
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else if (job.exportType === 'users') {
      data = await AppDataSource.query(`
        SELECT id, email, first_name, last_name, account_type, is_active, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else if (job.exportType === ExportJobType.FINANCIAL) {
      data = await AppDataSource.query(`
        SELECT id, amount_cents, currency, status, type, reference_id, created_at
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 5000
      `);
    } else {
      // General fall-back metrics
      data = await AppDataSource.query(`
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
    const headers = Object.keys(data[0] as Record<string, string | number | boolean | Date | null>);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const stringVal = val === null || val === undefined ? '' : String(val);
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
    job.fileName = filename;
    job.status = ExportJobStatus.COMPLETED;
    job.progress = 100;
    job.finishedAt = new Date();
    await exportRepo.save(job);

    logger.info({ jobId: job.id }, 'Export job completed successfully');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ err: error, jobId: job.id }, 'Export job failed');
    job.status = ExportJobStatus.FAILED;
    job.progress = 100;
    job.finishedAt = new Date();
    job.errorMessage = error.message;
    await exportRepo.save(job);
  }
}

export async function cleanupExpiredExportFiles(): Promise<void> {
  logger.info('Cleaning up expired export files');
  const exportRepo = AppDataSource.getRepository(ExportJob);
  const now = new Date();

  try {
    const expiredJobs = await exportRepo.find({
      where: { status: ExportJobStatus.COMPLETED },
    });

    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');

    for await (const job of expiredJobs) {
      if (job.expiresAt < now) {
        // Delete local file if it exists
        if (job.fileName) {
          const filePath = path.join(exportDir, job.fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        // Mark database status
        job.status = ExportJobStatus.EXPIRED;
        await exportRepo.save(job);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Cleanup of expired export files failed');
  }
}
