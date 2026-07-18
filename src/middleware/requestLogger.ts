import { randomUUID } from 'node:crypto';

import pinoHttp from 'pino-http';

import { logger } from '../config/logger';

import type { Request, Response } from 'express';
import { HttpStatusCode } from '@/core/AppError';

export const requestLogger = pinoHttp<Request, Response>({
  logger,
  genReqId: (req) => req.requestId ?? req.traceId ?? randomUUID(),
  customLogLevel(_req, res, err) {
    if (res.statusCode >= HttpStatusCode.INTERNAL_SERVER_ERROR || err) return 'error';
    if (res.statusCode >= HttpStatusCode.BAD_REQUEST) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => {
      const url = req.url.split('?')[0];
      return ['/health', '/ping', '/favicon.ico'].includes(url ?? '');
    },
  },
  customProps(req, res) {
    return {
      requestId: req.id,
      traceId: req.traceId ?? req.id,
      method: req.method,
      path: req.url.split('?')[0] ?? '',
      statusCode: res.statusCode,
    };
  },
  serializers: {
    req: () => undefined,
    res: () => undefined,
    err: () => undefined,
  },
  customSuccessMessage: () => 'request completed',
  customErrorMessage: () => 'request failed',
  formatters: {
    log(object: Record<string, unknown>) {
      if (object.responseTime !== undefined) {
        object.durationMs = object.responseTime;
        delete object.responseTime;
      }
      return object;
    },
  },
});
