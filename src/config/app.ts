import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { doubleCsrfProtection } from '../middleware/csrf';
import { errorHandler } from '../middleware/errorHandler';
import { globalLimiter } from '../middleware/rateLimits';
import { requestLogger } from '../middleware/requestLogger';
import { traceContext } from '../middleware/traceContext';
import { adminRouter } from '../modules/admin/admin.routes';
import { analyticsRouter } from '../modules/analytics/api/analytics.routes';
import { auditRouter } from '../modules/audit/api/audit.routes';
// ─── Route imports ────────────────────────────────────────────────────────────
import { authRouter } from '../modules/auth/auth.routes';
import { categoriesRouter } from '../modules/categories/categories.routes';
import { dashboardRouter } from '../modules/dashboard/api/dashboard.routes';
import { notificationsRouter } from '../modules/notifications/api/notifications.routes';
import { profileRouter } from '../modules/profile/profile.routes';
import rbacRouter from '../modules/rbac/rbac.routes';
import { statesRouter } from '../modules/states/states.routes';
import { plansRouter } from '../modules/subscriptions/plans.routes';
import { subscriptionsRouter } from '../modules/subscriptions/subscriptions.routes';
import { supportRouter } from '../modules/support/support.routes';
import { tendersRouter } from '../modules/tenders/tenders.routes';
import { webhooksRouter } from '../modules/webhooks/webhooks.routes';

import { appDataSource } from './database';
import { env } from './env';
import { logger } from './logger';
import { swaggerMiddleware, swaggerSpec } from './swagger';

import type { NextFunction, Request, Response } from 'express';

import 'reflect-metadata';

const app = express();

// ── Trace Context (MUST be first) ─────────────────────────────────────────────
app.use(traceContext);

// ── HTTP request logging (MUST be second) ─────────────────────────────────────
app.use(requestLogger);

// ── Trust proxy (MUST be before rate limiter so req.ip resolves to real client IP) ─
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow PDF viewer embed
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or same-origin)
      if (!origin) return callback(null, true);

      // Allow the specific frontend URLs
      const allowedOrigins = [env.FRONTEND_CUSTOMER_URL, env.FRONTEND_ADMIN_URL];

      if (
        allowedOrigins.includes(origin) ||
        (env.NODE_ENV === 'local' &&
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true, // Required for HTTP-only cookies
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-token'],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Cookie parsing (REQUIRED — Express does not parse cookies natively) ───────
app.use(cookieParser());

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Global rate limit ─────────────────────────────────────────────────────────
app.use('/api/', globalLimiter);

// ── CSRF protection ────────────────────────────────────────────────────────────
// Skipped in 'local' env so Postman/curl testing works without needing a CSRF token.
// Skip for webhooks — PayPal cannot send CSRF tokens.
// Active in: dev, uat, prod.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (env.NODE_ENV === 'local') return next();
  if (req.path.startsWith('/api/v1/webhooks')) return next();
  doubleCsrfProtection(req, res, next);
});

// ── Health check (public — no auth, no rate limit) ────────────────────────────
/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: System health check (Public)
 *     description: Verifies database connectivity and returns system status, uptime, and package version.
 *     operationId: healthCheck
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Database is connected and system is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, timestamp, uptime, version]
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 104.2
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *       503:
 *         description: Database connection is offline or degraded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, timestamp, uptime, version]
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "degraded"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 version:
 *                   type: string
 */
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const dbOk = await (async (): Promise<boolean> => {
    try {
      await appDataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  })();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
});

// ── Swagger UI (local + dev only) ────────────────────────────────────────────
if (env.SWAGGER_ENABLED) {
  // Relax CSP for the swagger UI route so the browser can load inline scripts/styles
  app.use('/api/v1/docs', (_req, _res, next) => {
    next();
  });
  app.use('/api/v1/docs', swaggerMiddleware);
  // Raw OpenAPI JSON for tooling (Postman, Insomnia, etc.)
  app.get('/api/v1/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  logger.info('Swagger UI available at /api/v1/docs');
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tenders', tendersRouter);
app.use('/api/v1/subscriptions', subscriptionsRouter);
app.use('/api/v1/plans', plansRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/states', statesRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/rbac', rbacRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/notifications', notificationsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

// ── Global error handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

export { app };
