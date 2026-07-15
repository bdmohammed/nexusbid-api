import pino from "pino";
import { env } from "./env";
import { getContext } from "./requestContext";

const isDev = env.NODE_ENV === "local" || env.NODE_ENV === "dev";
const isTest = env.NODE_ENV === "test";

let version = "1.0.0";
try {
  const pkg = require("../../package.json");
  version = pkg.version;
} catch {
  // fallback
}

const defaultLevel = isDev || isTest ? "debug" : "info";
const level = env.LOG_LEVEL || defaultLevel;

export const logger = pino({
  level,
  messageKey: "message",
  mixin() {
    const context = getContext();
    return context
      ? {
          requestId: context.requestId,
          traceId: context.traceId,
          userId: context.userId,
        }
      : {};
  },
  base: {
    service: env.APP_NAME,
    version,
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
      'req.headers["set-cookie"]',
      "req.body.password",
      "req.body.confirmPassword",
      "req.body.token",
      "req.body.refreshToken",
      "req.body.accessToken",
      "req.body.creditCard",
      "req.body.cvv",
      "req.body.paypalClientSecret",
      "req.body.paypalWebhookSecret",
      "*.paypalSecret",
      "*.paypalPassword",
      "*.webhookSecret",
      "*.apiKey",
      "*.secret",
      "*.clientSecret",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      }),
});
