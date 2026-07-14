import type { Request, Response, NextFunction } from 'express';
import * as service from '../services/audit.service';
import { AuditQuerySchema, UpdateRetentionSchema, RequestAuditExportSchema } from '../dto/audit.dto';
import { AppError } from '../../../core/AppError';

export async function searchLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = AuditQuerySchema.parse(req.query);
    const data = await service.searchLogs(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getStatistics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getLogDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = await service.getLogDetails(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCorrelationTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { correlationId } = req.params;
    const data = await service.getCorrelationTimeline(correlationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRequestTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.params;
    const data = await service.getRequestTimeline(requestId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSecurityEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query['limit'] as string || '20', 10));
    const data = await service.getSecurityEvents(page, limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRetentionPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getRetentionPolicies();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateRetentionPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = UpdateRetentionSchema.parse(req.body);
    const data = await service.updateRetentionPolicy(dto);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function requestAuditExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const dto = RequestAuditExportSchema.parse(req.body);
    const data = await service.queueExportJob(userId, dto);
    res.json({ success: true, data, message: 'Audit export job queued successfully.' });
  } catch (err) {
    next(err);
  }
}
