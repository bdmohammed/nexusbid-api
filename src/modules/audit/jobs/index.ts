import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../../../config/database';
import { AuditLog } from '../../../entities/AuditLog';
import { AuditRetentionPolicy } from '../../../entities/AuditRetentionPolicy';
import { ExportJob } from '../../../entities/ExportJob';
import { SecurityLog } from '../../../entities/SecurityLog';
import { logger } from '../../../config/logger';

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

  for (const policy of policies) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - policy.retentionDays);

    // Fetch expired logs
    const expiredLogs = await auditRepo.createQueryBuilder('log')
      .where('log.module = :module AND log.createdAt < :threshold', {
        module: policy.category,
        threshold: thresholdDate
      })
      .getMany();

    if (expiredLogs.length === 0) continue;

    // Compile CSV layout
    const header = 'id,eventId,correlationId,requestId,actorEmail,action,module,severity,status,createdAt\n';
    const csvContent = expiredLogs.map((l) => (
      `"${l.id}","${l.eventId}","${l.correlationId || ''}","${l.requestId || ''}","${l.actorEmail}","${l.action}","${l.module || ''}","${l.severity || ''}","${l.status || ''}","${l.createdAt.toISOString()}"`
    )).join('\n');

    const filename = `archive_${policy.category.toLowerCase()}_${Date.now()}.csv`;
    fs.writeFileSync(path.join(archiveDir, filename), header + csvContent);

    // Delete records from database only after cold storage write completes
    const ids = expiredLogs.map((l) => l.id);
    await auditRepo.createQueryBuilder()
      .delete()
      .whereInIds(ids)
      .execute();

    logger.info({ category: policy.category, count: ids.length, filename }, 'Archived and pruned audit logs.');
  }
}

// ─── Task 2: Async Query Export ──────────────────────────────────────────────

export async function processAuditExports(): Promise<void> {
  const exportRepo = AppDataSource.getRepository(ExportJob);
  const auditRepo = AppDataSource.getRepository(AuditLog);

  const pendingJob = await exportRepo.findOne({
    where: { status: 'PENDING' },
    order: { createdAt: 'ASC' }
  });

  if (!pendingJob) return;

  logger.info({ jobId: pendingJob.id }, 'Processing pending audit export job...');
  pendingJob.status = 'PROCESSING';
  pendingJob.progress = 10;
  await exportRepo.save(pendingJob);

  try {
    const logs = await auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 1000 // Limit preview scope for query performance
    });

    pendingJob.progress = 50;
    await exportRepo.save(pendingJob);

    const header = 'Timestamp,Event ID,Severity,Action,Module,User,IP,Status\n';
    const rows = logs.map((l) => (
      `"${l.createdAt.toISOString()}","${l.eventId}","${l.severity || 'INFO'}","${l.action}","${l.module || ''}","${l.actorEmail}","${l.ipAddress || ''}","${l.status || 'SUCCESS'}"`
    )).join('\n');

    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `audit_export_${pendingJob.id}.csv`;
    fs.writeFileSync(path.join(exportDir, filename), header + rows);

    pendingJob.status = 'COMPLETED';
    pendingJob.progress = 100;
    pendingJob.fileUrl = `/api/v1/analytics/exports/download/${filename}`;
    await exportRepo.save(pendingJob);

    logger.info({ jobId: pendingJob.id, filename }, 'Audit logs export completed.');
  } catch (err) {
    logger.error({ err, jobId: pendingJob.id }, 'Audit logs export failed.');
    pendingJob.status = 'FAILED';
    pendingJob.progress = 0;
    await exportRepo.save(pendingJob);
  }
}

// ─── Task 3: Security Alert Scanner ─────────────────────────────────────────

export async function runSecurityAlertScanner(): Promise<void> {
  logger.info('Scanning for security alerts (failed logins, brute force)...');
  const securityRepo = AppDataSource.getRepository(SecurityLog);

  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  // Group failed login attempts by IP
  const failures = await securityRepo.createQueryBuilder('s')
    .select('s.ipAddress', 'ip')
    .addSelect('COUNT(s.id)::int', 'count')
    .where('s.event = :event AND s.createdAt >= :threshold', {
      event: 'LOGIN_FAILED',
      threshold: tenMinutesAgo
    })
    .groupBy('s.ipAddress')
    .having('COUNT(s.id) >= :minCount', { minCount: 5 })
    .getRawMany();

  if (failures.length > 0) {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    for (const fail of failures) {
      // Check if we already logged this warning recently to avoid duplication
      const existing = await auditRepo.findOne({
        where: {
          action: 'SECURITY_ALERT',
          ipAddress: fail.ip,
          severity: 'CRITICAL'
        }
      });

      if (existing) continue;

      await auditRepo.save({
        action: 'SECURITY_ALERT',
        module: 'AUTH',
        severity: 'CRITICAL',
        status: 'FAILED',
        actorEmail: 'system',
        entityType: 'security',
        ipAddress: fail.ip,
        before: null,
        after: null,
        metadata: {
          reason: 'Brute force warning: 5 failed login attempts within 10 minutes.',
          failureCount: fail.count
        }
      });

      logger.warn({ ip: fail.ip, count: fail.count }, 'Brute force attempt detected. Critical audit alert generated.');
    }
  }
}
