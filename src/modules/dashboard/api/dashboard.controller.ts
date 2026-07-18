import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../../core/AppError';
import { asyncHandler } from '../../../core/asyncHandler';
import { type PatchLayoutDto } from '../dto/dashboard.dto';
import * as dashboardService from '../services/dashboard.service';

import { logger } from '@/config/logger';

// ─── Config & Layout ──────────────────────────────────────────────────────────

export const getConfig = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const config = await dashboardService.getDashboardConfig(
    req.user.userId,
    req.roles ?? [],
    req.permissions ?? [],
  );

  res.json({
    status: 'SUCCESS',
    data: config,
  });
});

export const updateLayout = asyncHandler<{}, object, PatchLayoutDto>(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const { widgets, theme } = req.body;

  const layout = await dashboardService.updateDashboardLayout(req.user.userId, widgets, theme);

  res.json({
    status: 'SUCCESS',
    data: layout,
  });
});

export const resetLayout = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const layout = await dashboardService.resetDashboardLayout(req.user.userId, req.roles ?? []);

  res.json({
    status: 'SUCCESS',
    data: layout,
  });
});

// ─── Widget Specific Composition Endpoints ────────────────────────────────────

export const getTenderStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTenderData();
  res.json({ status: 'SUCCESS', data });
});

export const getRevenueStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRevenueData();
  res.json({ status: 'SUCCESS', data });
});

export const getUsersStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getUsersData();
  res.json({ status: 'SUCCESS', data });
});

export const getReviewQueue = asyncHandler(async (req, res) => {
  const data = await dashboardService.getReviewQueueData();
  res.json({ status: 'SUCCESS', data });
});

export const getCriticalAlerts = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCriticalAlertsData();
  res.json({ status: 'SUCCESS', data });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRecentActivityData();
  res.json({ status: 'SUCCESS', data });
});

export const getSystemHealth = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSystemHealthData();
  res.json({ status: 'SUCCESS', data });
});

export const getQuickActionsList = asyncHandler(async (req, res) => {
  const data = dashboardService.getQuickActions(req.permissions ?? []);
  res.json({ status: 'SUCCESS', data });
});

// ─── Real-Time Stream (SSE) ───────────────────────────────────────────────────

export const streamDashboardUpdates = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client_${Date.now()}`;

  dashboardService.addSSEClient({
    id: clientId,
    res,
    userId: req.user.userId,
    roles: req.roles ?? [],
    permissions: req.permissions ?? [],
  });

  // Push immediate connection acknowledgement
  res.write(`event: connection\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`);

  // Emulating typed live data push on connection
  setTimeout(async () => {
    try {
      const reviewQueue = await dashboardService.getReviewQueueData();
      const alerts = await dashboardService.getCriticalAlertsData();
      const health = dashboardService.getSystemHealthData();

      res.write(`event: review_queue\ndata: ${JSON.stringify(reviewQueue)}\n\n`);
      res.write(`event: alerts\ndata: ${JSON.stringify(alerts)}\n\n`);
      res.write(`event: health\ndata: ${JSON.stringify(health)}\n\n`);
    } catch (err) {
      // Slently ignore push failure
      logger.error(err, 'Failed to push dashboard updates');
    }
  }, 1000);
});
