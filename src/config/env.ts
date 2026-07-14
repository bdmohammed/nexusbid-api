import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// ─── Step 1: Load global defaults (.env) ─────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ─── Step 2: Load environment-specific overrides (.env.local / .env.dev / etc) ─
const nodeEnv = process.env["NODE_ENV"] || "local";
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
  override: true,
});

// ─── Step 3: If running inside Docker Compose (DOCKER=true), swap DB host ────
// This allows a single .env.local / .env.dev to work both natively and in Docker.
if (process.env["DOCKER"] === "true" && process.env["DATABASE_URL"]) {
  const host = nodeEnv === "local" ? "db" : "host.docker.internal";
  process.env["DATABASE_URL"] = process.env["DATABASE_URL"].replace(
    /@localhost:/,
    `@${host}:`,
  );
}

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const envSchema = z.object({
  // App
  APP_NAME: z.string().default("nexusbid-api"),
  NODE_ENV: z.enum(["local", "dev", "uat", "prod", "test"]).default("local"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
  PORT: z.coerce.number().default(3000),
  FRONTEND_CUSTOMER_URL: z.string().url(),
  FRONTEND_ADMIN_URL: z.string().url(),
  DOCKER: z.coerce.boolean().default(false),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_SLOW_QUERY_THRESHOLD: z.coerce.number().int().default(1000),

  // JWT & Session
  JWT_SECRET: z.string().min(64, "JWT_SECRET must be at least 64 characters"),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be at least 32 characters"),

  // PayPal — optional in local env (dummy mode)
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_SECRET: z.string().min(1),
  PAYPAL_ENV: z.enum(["sandbox", "prod"]).default("sandbox"),
  PAYPAL_WEBHOOK_ID: z.string().min(1),

  // AWS S3 — optional in local env (dummy mode)
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().min(1),

  // Email — configured via EMAIL_PROVIDER
  EMAIL_PROVIDER: z.enum(["ses", "dummy"]).default("dummy"),
  FROM_EMAIL: z.string().email(),
  NEXUSBID_SYSTEM_ADMIN_EMAIL: z.string().email(),

  // Features
  SWAGGER_ENABLED: z.coerce.boolean().default(false),

  // PM2 cron guard — set automatically by PM2 cluster mode
  NODE_APP_INSTANCE: z.string().optional(),

  // API Base URL
  API_URL: z.string().url().default("http://localhost:3000"),

  // OAuth Credentials (optional to ensure compiling / dev sandboxing without config)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  SYSTEM_OWNER_EMAIL: z.string().email().default("owner@example.com"),
});

export type AppEnv = z.infer<typeof envSchema>;

/** True when running in local (no-real-services) mode */
export const isLocalEnv = (): boolean => process.env["NODE_ENV"] === "local";

/** True when running in production */
export const isProdEnv = (): boolean => process.env["NODE_ENV"] === "prod";

/** True when running in test suite */
export const isTestEnv = (): boolean => process.env["NODE_ENV"] === "test";

function validateEnv(): AppEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
