import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../core/asyncHandler';
import { AppError } from '../../../core/AppError';
import * as dashboardService from '../services/dashboard.service';
import { PatchLayoutSchema } from '../dto/dashboard.dto';

// ─── Config & Layout ──────────────────────────────────────────────────────────

export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const config = await dashboardService.getDashboardConfig(
    req.user.userId,
    req.roles ?? [],
    req.permissions ?? []
  );

  res.json({
    status: 'SUCCESS',
    data: config,
  });
});

export const updateLayout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const result = PatchLayoutSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError('Invalid layout configuration data', 400, 'VALIDATION_FAILED');
  }

  const layout = await dashboardService.updateDashboardLayout(
    req.user.userId,
    result.data.widgets,
    result.data.theme
  );

  res.json({
    status: 'SUCCESS',
    data: layout,
  });
});

export const resetLayout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  const layout = await dashboardService.resetDashboardLayout(req.user.userId, req.roles ?? []);

  res.json({
    status: 'SUCCESS',
    data: layout,
  });
});

// ─── Widget Specific Composition Endpoints ────────────────────────────────────

export const getTenderStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getTenderData();
  res.json({ status: 'SUCCESS', data });
});

export const getRevenueStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getRevenueData();
  res.json({ status: 'SUCCESS', data });
});

export const getUsersStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getUsersData();
  res.json({ status: 'SUCCESS', data });
});

export const getReviewQueue = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getReviewQueueData();
  res.json({ status: 'SUCCESS', data });
});

export const getCriticalAlerts = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getCriticalAlertsData();
  res.json({ status: 'SUCCESS', data });
});

export const getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getRecentActivityData();
  res.json({ status: 'SUCCESS', data });
});

export const getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getSystemHealthData();
  res.json({ status: 'SUCCESS', data });
});

export const getQuickActionsList = asyncHandler(async (req: Request, res: Response) => {
  const data = dashboardService.getQuickActions(req.permissions ?? []);
  res.json({ status: 'SUCCESS', data });
});

// ─── Real-Time Stream (SSE) ───────────────────────────────────────────────────

export const streamDashboardUpdates = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
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
    }
  }, 1000);
};
