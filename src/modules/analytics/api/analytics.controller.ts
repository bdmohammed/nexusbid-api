import * as fs from 'node:fs';
import * as path from 'node:path';

import { AppError } from '../../../core/AppError';
import {
  AnalyticsQuerySchema,
  CreateScheduledReportSchema,
  RequestExportSchema,
  SaveDashboardLayoutSchema,
} from '../dto/analytics.dto';
import * as analyticsService from '../services/analytics.service';

import type { NextFunction, Request, Response } from 'express';

// Helper to check user permission
function ensurePermission(req: Request, permission: string): void {
  const userPermissions = (req as any).user?.permissions ?? [];
  if (!userPermissions.includes(permission)) {
    throw new AppError('Unauthorized access to metrics', 403, 'FORBIDDEN');
  }
}

export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const filters = AnalyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getOverviewStats(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTenders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const filters = AnalyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getTenderAnalytics(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUsersMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.users');
    const filters = AnalyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getUserAnalytics(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRevenueMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.financial');
    const filters = AnalyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getRevenueAnalytics(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCategoriesMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const data = await analyticsService.getCategoryAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSystemMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.system');
    const data = await analyticsService.getSystemPerformanceMetrics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Dashboard Customization & Alerting ──────────────────────────────────────

export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const data = await analyticsService.getDashboardLayout(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function saveDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const dto = SaveDashboardLayoutSchema.parse(req.body);
    const data = await analyticsService.saveDashboardLayout(userId, dto);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAlertsList(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const data = await analyticsService.listActiveAlerts();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function resolveAlertTrigger(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.view');
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const { alertId } = req.params;
    const data = await analyticsService.resolveAlert(alertId, userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ─── Asynchronous Exports & Download ────────────────────────────────────────

export async function requestDataExport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.export');
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const dto = RequestExportSchema.parse(req.body);
    const data = await analyticsService.createExportJob(userId, dto.exportType);
    res.json({ success: true, data, message: 'Export job queued successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function getExportJobs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.export');
    const userId = (req as any).user?.id;
    if (!userId) throw new AppError('User not logged in', 401, 'UNAUTHORIZED');

    const data = await analyticsService.getExportJobsList(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function downloadExportFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { filename } = req.params;
    const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');
    const filePath = path.join(exportDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found or link has expired', 404, 'NOT_FOUND');
    }

    res.download(filePath);
  } catch (err) {
    next(err);
  }
}

// ─── Scheduled Reports ───────────────────────────────────────────────────────

export async function createReportSchedule(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.reports');
    const dto = CreateScheduledReportSchema.parse(req.body);
    const data = await analyticsService.createScheduledReport(dto);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listReportSchedules(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    ensurePermission(req, 'analytics.reports');
    const data = await analyticsService.listScheduledReports();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
