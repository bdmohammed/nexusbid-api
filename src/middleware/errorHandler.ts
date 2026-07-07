import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueryFailedError } from 'typeorm';
import { AppError } from '../core/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { getTraceId, getContext } from '../config/requestContext';

interface AppErrorWithErrors extends AppError {
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Global error handler — MUST be registered last in app.ts.
 *
 * Handles:
 *   - AppError (operational errors) → structured JSON with code
 *   - ZodError → 422 with field-level errors
 *   - TypeORM QueryFailedError → 409 for unique constraint violations
 *   - csrf-csrf errors → 403
 *   - Unknown errors → 500 (stack hidden in production)
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const activeLogger = req.log || logger;
  const traceId = getTraceId() ?? (req as any).traceId ?? 'unknown';
  const requestId = getContext()?.requestId ?? (req as any).requestId ?? (req as any).id ?? 'unknown';
  const userId = getContext()?.userId ?? req.user?.userId;

  // ── AppError ────────────────────────────────────────────────────────────────
  if (err instanceof AppError) {
    const appErr = err as AppErrorWithErrors;
    activeLogger.warn(
      {
        requestId,
        traceId,
        method: req.method,
        path: req.path,
        userId,
        statusCode: err.statusCode,
        code: err.code,
      },
      err.message,
    );
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.code,
      ...(appErr.errors ? { errors: appErr.errors } : {}),
      traceId,
    });
    return;
  }

  // ── Zod (should be caught by validate middleware, but belt-and-suspenders) ──
  if (err instanceof ZodError) {
    const validationErrors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    activeLogger.warn(
      {
        requestId,
        traceId,
        method: req.method,
        path: req.path,
        userId,
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        errors: validationErrors,
      },
      'Validation failed',
    );
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      errors: validationErrors,
      traceId,
    });
    return;
  }

  // ── TypeORM unique constraint violation ─────────────────────────────────────
  if (err instanceof QueryFailedError) {
    const pgError = err as QueryFailedError & { code?: string; detail?: string };
    if (pgError.code === '23505') {
      activeLogger.warn(
        {
          requestId,
          traceId,
          method: req.method,
          path: req.path,
          userId,
          statusCode: 409,
          code: 'CONFLICT',
          detail: pgError.detail,
        },
        'Database record conflict',
      );
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
        error: 'CONFLICT',
        traceId,
        ...(['local', 'dev'].includes(env.NODE_ENV) ? { detail: pgError.detail } : {}),
      });
      return;
    }
    if (pgError.code === '23503') {
      activeLogger.warn(
        {
          requestId,
          traceId,
          method: req.method,
          path: req.path,
          userId,
          statusCode: 409,
          code: 'FK_VIOLATION',
        },
        'Database foreign key violation',
      );
      res.status(409).json({
        success: false,
        message: 'Referenced record does not exist',
        error: 'FK_VIOLATION',
        traceId,
      });
      return;
    }
  }

  // ── CSRF error ──────────────────────────────────────────────────────────────
  if (err instanceof Error && err.message === 'invalid csrf token') {
    activeLogger.warn(
      {
        requestId,
        traceId,
        method: req.method,
        path: req.path,
        userId,
        statusCode: 403,
        code: 'CSRF_INVALID',
      },
      'CSRF validation failed',
    );
    res.status(403).json({
      success: false,
      message: 'CSRF validation failed. Refresh the page and try again.',
      error: 'CSRF_INVALID',
      traceId,
    });
    return;
  }

  // ── Unknown / unexpected error ──────────────────────────────────────────────
  const error = err instanceof Error ? err : new Error(String(err));
  activeLogger.error(
    {
      err: error,
      requestId,
      traceId,
      method: req.method,
      path: req.path,
      userId,
      statusCode: 500,
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: 'INTERNAL_ERROR',
    traceId,
    ...(['local', 'dev'].includes(env.NODE_ENV) ? { stack: error.stack } : {}),
  });
};
