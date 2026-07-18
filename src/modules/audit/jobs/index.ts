import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { AppDataSource } from '../../../config/database';
import { logger } from '../../../config/logger';
import { AuditLog } from '../../../database/entities/AuditLog';
import { AuditRetentionPolicy } from '../../../database/entities/AuditRetentionPolicy';
import { ExportJob } from '../../../database/entities/ExportJob';
import { SecurityLog } from '../../../database/entities/SecurityLog';
import {
  AuditSeverity,
  AuditStatus,
  ExportJobStatus,
  RetentionCategory,
} from '../../../types/enums';

// ─── Task 1: Audit Archival ──────────────────────────────────────────────────

export async function runAuditArchival(): Promise<void> {
  logger.info('Starting audit log retention archival job...');
  const policyRepo = AppDataSource.getRepository(AuditRetentionPolicy);
  const auditRepo = AppDataSource.getRepository(AuditLog);

  const policies = await policyRepo.find();
  const archiveDir = path.join(__dirname, '..', '..', '..', '..', 'exports', 'archives');

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  for await (const policy of policies) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - policy.retentionDays);

    if (policy.category === RetentionCategory.AUDIT_LOG) {
      const expiredLogs = await auditRepo
        .createQueryBuilder('log')
        .where('log.createdAt < :threshold', { threshold: thresholdDate })
        .getMany();

      if (expiredLogs.length === 0) continue;

      const header =
        'id,eventId,correlationId,requestId,actorEmail,action,module,severity,status,createdAt\n';
      const csvContent = expiredLogs
        .map(
          (l) =>
            `"${l.id}","${l.eventId}","${l.correlationId ?? ''}","${l.requestId ?? ''}","${l.actorEmail}","${l.action}","${l.module}","${l.severity}","${l.status}","${l.createdAt.toISOString()}"`,
        )
        .join('\n');

      const filename = `archive_audit_log_${Date.now()}.csv`;
      fs.writeFileSync(path.join(archiveDir, filename), header + csvContent);

      const ids = expiredLogs.map((l) => l.id);
      await auditRepo.createQueryBuilder().delete().whereInIds(ids).execute();

      logger.info(
        { category: policy.category, count: ids.length, filename },
        'Archived and pruned audit logs.',
      );
    } else if (policy.category === RetentionCategory.SECURITY_LOG) {
      const securityRepo = AppDataSource.getRepository(SecurityLog);
      const expiredLogs = await securityRepo
        .createQueryBuilder('log')
        .where('log.createdAt < :threshold', { threshold: thresholdDate })
        .getMany();

      if (expiredLogs.length === 0) continue;

      const header = 'id,correlationId,requestId,email,event,ipAddress,userAgent,createdAt\n';
      const csvContent = expiredLogs
        .map(
          (l) =>
            `"${l.id}","${l.correlationId ?? ''}","${l.requestId ?? ''}","${l.email ?? ''}","${l.event}","${l.ipAddress ?? ''}","${l.userAgent ?? ''}","${l.createdAt.toISOString()}"`,
        )
        .join('\n');

      const filename = `archive_security_log_${Date.now()}.csv`;
      fs.writeFileSync(path.join(archiveDir, filename), header + csvContent);

      const ids = expiredLogs.map((l) => l.id);
      await securityRepo.createQueryBuilder().delete().whereInIds(ids).execute();

      logger.info(
        { category: policy.category, count: ids.length, filename },
        'Archived and pruned security logs.',
      );
    } else if (policy.category === RetentionCategory.EXPORT_JOB) {
      const exportRepo = AppDataSource.getRepository(ExportJob);
      const result = await exportRepo
        .createQueryBuilder()
        .delete()
        .where('createdAt < :threshold', { threshold: thresholdDate })
        .execute();

      logger.info(
        { category: policy.category, count: result.affected ?? 0 },
        'Pruned expired export jobs.',
      );
    }
  }
}

// ─── Task 2: Async Query Export ──────────────────────────────────────────────

export async function processAuditExports(): Promise<void> {
  const exportRepo = AppDataSource.getRepository(ExportJob);
  const auditRepo = AppDataSource.getRepository(AuditLog);

  const pendingJob = await exportRepo.findOne({
    where: { status: ExportJobStatus.PENDING, queueName: 'audit' },
    order: { createdAt: 'ASC' },
  });

  if (!pendingJob) return;

  logger.info({ jobId: pendingJob.id }, 'Processing pending audit export job...');
  pendingJob.status = ExportJobStatus.PROCESSING;
  pendingJob.progress = 10;
  await exportRepo.save(pendingJob);

  try {
    const logs = await auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 1000, // Limit preview scope for query performance
    });

    pendingJob.progress = 50;
    await exportRepo.save(pendingJob);

    const header = 'Timestamp,Event ID,Severity,Action,Module,User,IP,Status\n';
    const rows = logs
      .map(
        (l) =>
          `"${l.createdAt.toISOString()}","${l.eventId}","${l.severity}","${l.action}","${l.module}","${l.actorEmail}","${l.ipAddress ?? ''}","${l.status}"`,
      )
      .join('\n');

    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `audit_export_${pendingJob.id}.csv`;
    fs.writeFileSync(path.join(exportDir, filename), header + rows);

    pendingJob.status = ExportJobStatus.COMPLETED;
    pendingJob.progress = 100;
    pendingJob.fileName = filename;
    await exportRepo.save(pendingJob);

    logger.info({ jobId: pendingJob.id, filename }, 'Audit logs export completed.');
  } catch (err) {
    logger.error({ err, jobId: pendingJob.id }, 'Audit logs export failed.');
    pendingJob.status = ExportJobStatus.FAILED;
    pendingJob.progress = 0;
    await exportRepo.save(pendingJob);
  }
}

// ─── Task 3: Security Alert Scanner ─────────────────────────────────────────

interface RawFailure {
  ip: string | null;
  count: number;
}

export async function runSecurityAlertScanner(): Promise<void> {
  logger.info('Scanning for security alerts (failed logins, brute force)...');
  const securityRepo = AppDataSource.getRepository(SecurityLog);

  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  // Group failed login attempts by IP
  const failuresRaw = await securityRepo
    .createQueryBuilder('s')
    .select('s.ipAddress', 'ip')
    .addSelect('COUNT(s.id)::int', 'count')
    .where('s.event = :event AND s.createdAt >= :threshold', {
      event: 'LOGIN_FAILED',
      threshold: tenMinutesAgo,
    })
    .groupBy('s.ipAddress')
    .having('COUNT(s.id) >= :minCount', { minCount: 5 })
    .getRawMany();

  const failures = failuresRaw as RawFailure[];

  if (failures.length > 0) {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    for (const fail of failures) {
      if (!fail.ip) continue;

      // Check if we already logged this warning recently to avoid duplication
      const existing = await auditRepo.findOne({
        where: {
          action: 'SECURITY_ALERT',
          ipAddress: fail.ip,
          severity: AuditSeverity.CRITICAL,
        },
      });

      if (existing) continue;

      const alertLog = auditRepo.create({
        eventId: randomUUID(),
        action: 'SECURITY_ALERT',
        module: 'AUTH',
        severity: AuditSeverity.CRITICAL,
        status: AuditStatus.FAILURE,
        actorEmail: 'system',
        ipAddress: fail.ip,
        before: {},
        after: {},
        metadata: {
          reason: 'Brute force warning: 5 failed login attempts within 10 minutes.',
          failureCount: fail.count,
        },
      });

      await auditRepo.save(alertLog);

      logger.warn(
        { ip: fail.ip, count: fail.count },
        'Brute force attempt detected. Critical audit alert generated.',
      );
    }
  }
}
