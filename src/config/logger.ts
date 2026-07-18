import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from './env';
import { getContext } from './requestContext';

const isDev = env.NODE_ENV === 'local' || env.NODE_ENV === 'dev';
const isTest = env.NODE_ENV === 'test';

const defaultLevel = isDev || isTest ? 'debug' : 'info';
const level = env.LOG_LEVEL ?? defaultLevel;

export const logger = pino(
  {
    level,
    mixin() {
      const context = getContext();
      return context ? { traceId: context.traceId, userId: context.userId } : {};
    },
    base: {
      service: env.APP_NAME,
      version: env.npm_package_version,
      env: env.NODE_ENV,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.headers["set-cookie"]',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.accessToken',
        'req.body.creditCard',
        'req.body.cvv',
        'req.body.paypalClientSecret',
        'req.body.paypalWebhookSecret',
        '*.paypalSecret',
        '*.paypalPassword',
        '*.webhookSecret',
        '*.apiKey',
        '*.secret',
        '*.clientSecret',
      ],
      censor: '[REDACTED]',
    },
    ...(!isDev
      ? {
          formatters: {
            level(label) {
              return { level: label };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        }
      : {}),
  },
  isDev
    ? pretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      })
    : undefined,
);
