import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

import { env } from '../config/env';
import { getContext } from '../config/requestContext';
import { AppError, AppErrorCode } from '../core/AppError';

import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { firstDefined } from '@/utils';

interface AppErrorWithErrors extends AppError {
  errors?: Array<{ field: string; message: string }>;
}

interface ErrorContext {
  activeLogger: Logger;
  traceId: string;
  requestId: string;
  userId?: string;
  res: Response;
  method: string;
  path: string;
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
  _next: NextFunction,
): void => {
  const context = getErrorContext(req, res);

  if (err instanceof AppError) {
    return handleAppError(err, context);
  }

  // ── Zod (should be caught by validate middleware, but belt-and-suspenders) ──
  if (err instanceof ZodError) {
    return handleZodError(err, context);
  }

  // ── TypeORM unique constraint violation ─────────────────────────────────────
  if (err instanceof QueryFailedError) {
    return handleQueryFailedError(err, context);
  }

  if (isCsrfError(err)) {
    return handleCsrfError(context);
  }

  return handleUnknownError(err, context);
};

function getErrorContext(req: Request, res: Response): ErrorContext {
  const ctx = getContext();

  return {
    activeLogger: req.log,
    traceId: firstDefined<string>(ctx?.traceId, req.traceId, 'unknown'),
    requestId: firstDefined<string>(ctx?.requestId, req.requestId, req.id, 'unknown'),
    userId: firstDefined<string>(ctx?.userId, req.user?.userId),
    res,
    method: req.method,
    path: req.path,
  };
}

function handleAppError(err: AppError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const appErr = err as AppErrorWithErrors;
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
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
}

function handleZodError(err: ZodError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const validationErrors = err.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
      userId,
      statusCode: 422,
      code: AppErrorCode.VALIDATION_ERROR,
      errors: validationErrors,
    },
    AppErrorCode.VALIDATION_FAILED,
  );
  res.status(422).json({
    success: false,
    message: AppErrorCode.VALIDATION_FAILED,
    error: AppErrorCode.VALIDATION_ERROR,
    errors: validationErrors,
    traceId,
  });
}

type PgQueryFailedError = QueryFailedError<Error> & {
  code?: string;
  detail?: string;
};

function handleQueryFailedError(err: PgQueryFailedError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const pgError = err;
  if (pgError.code === '23505') {
    activeLogger.warn(
      {
        requestId,
        traceId,
        method,
        path,
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
        method,
        path,
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

function isCsrfError(err: unknown): boolean {
  return err instanceof Error && err.message === 'invalid csrf token';
}

function handleCsrfError(context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
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
}

function handleUnknownError(err: unknown, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const error = err instanceof Error ? err : new Error(String(err));
  activeLogger.error(
    {
      err: error,
      requestId,
      traceId,
      method,
      path,
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
}
