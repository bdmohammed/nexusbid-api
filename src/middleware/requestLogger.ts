import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: any) => req.requestId || req.traceId || randomUUID(),
  customLogLevel(req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => {
      const url = req.url?.split('?')[0];
      return ['/health', '/ping', '/favicon.ico'].includes(url || '');
    },
  },
  customProps(req: any, res: any) {
    return {
      requestId: req.id,
      traceId: req.traceId || req.id,
      method: req.method,
      endpoint: req.url?.split('?')[0],
      status: res.statusCode,
    };
  },
  customErrorObject: () => ({}),
  serializers: {
    req: () => undefined,
    res: () => undefined,
  },
  customSuccessMessage: () => 'request completed',
  customErrorMessage: () => 'request failed',
  formatters: {
    log(object: any) {
      if (object.responseTime !== undefined) {
        object.duration = object.responseTime;
        delete object.responseTime;
      }
      return object;
    },
  },
});
