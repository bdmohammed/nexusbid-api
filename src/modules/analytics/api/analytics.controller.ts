import * as fs from 'node:fs';
import * as path from 'node:path';

import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../../core/AppError';
import { asyncHandler } from '../../../core/asyncHandler';
import * as analyticsService from '../services/analytics.service';

import type {
  AlertIdParamDto,
  AnalyticsQueryDto,
  CreateScheduledReportDto,
  FilenameParamDto,
  RequestExportDto,
  SaveDashboardLayoutDto,
} from '../dto/analytics.dto';
import type { JwtPayload } from '@/types/express';

export const getOverview = asyncHandler<{}, object, {}, AnalyticsQueryDto>(async (req, res) => {
  const data = await analyticsService.getOverviewStats(req.query);
  res.json({ success: true, data });
});

export const getTenders = asyncHandler<{}, object, {}, AnalyticsQueryDto>(async (req, res) => {
  const data = await analyticsService.getTenderAnalytics(req.query);
  res.json({ success: true, data });
});

export const getUsersMetrics = asyncHandler<{}, object, {}, AnalyticsQueryDto>(async (req, res) => {
  const data = await analyticsService.getUserAnalytics(req.query);
  res.json({ success: true, data });
});

export const getRevenueMetrics = asyncHandler<{}, object, {}, AnalyticsQueryDto>(
  async (req, res) => {
    const data = await analyticsService.getRevenueAnalytics(req.query);
    res.json({ success: true, data });
  },
);

export const getCategoriesMetrics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getCategoryAnalytics();
  res.json({ success: true, data });
});

export const getSystemMetrics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSystemPerformanceMetrics();
  res.json({ success: true, data });
});

// ─── Dashboard Customization & Alerting ──────────────────────────────────────

export const getDashboard = asyncHandler(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const data = await analyticsService.getDashboardLayout(userId);
  res.json({ success: true, data });
});

export const saveDashboard = asyncHandler<{}, object, SaveDashboardLayoutDto>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const data = await analyticsService.saveDashboardLayout(userId, req.body);
  res.json({ success: true, data });
});

export const getAlertsList = asyncHandler(async (req, res) => {
  const data = await analyticsService.listActiveAlerts();
  res.json({ success: true, data });
});

export const resolveAlertTrigger = asyncHandler<AlertIdParamDto>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const { alertId } = req.params;
  const data = await analyticsService.resolveAlert(alertId, userId);
  res.json({ success: true, data });
});

// ─── Asynchronous Exports & Download ────────────────────────────────────────

export const requestDataExport = asyncHandler<{}, object, RequestExportDto>(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const data = await analyticsService.createExportJob(userId, req.body.exportType);
  res.json({ success: true, data, message: 'Export job queued successfully.' });
});

export const getExportJobs = asyncHandler(async (req, res) => {
  const { userId } = req.user as JwtPayload;
  const data = await analyticsService.getExportJobsList(userId);
  res.json({ success: true, data });
});

export const downloadExportFile = asyncHandler<FilenameParamDto>(async (req, res) => {
  const { filename } = req.params;
  const exportDir = path.join(__dirname, '..', '..', '..', '..', 'exports');
  const filePath = path.join(exportDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new AppError(
      AppErrorMessage.FILE_NOT_FOUND_OR_EXPIRED,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  res.download(filePath);
});

// ─── Scheduled Reports ───────────────────────────────────────────────────────

export const createReportSchedule = asyncHandler<{}, object, CreateScheduledReportDto>(
  async (req, res) => {
    const { userId } = req.user as JwtPayload;
    const data = await analyticsService.createScheduledReport(userId, req.body);
    res.json({ success: true, data });
  },
);

export const listReportSchedules = asyncHandler(async (_req, res) => {
  const data = await analyticsService.listScheduledReports();
  res.json({ success: true, data });
});
