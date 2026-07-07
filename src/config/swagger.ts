import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { RequestHandler } from 'express';
import { env } from './env';

const serverUrls: Record<string, { url: string; description: string }[]> = {
  local: [{ url: 'http://localhost:3000', description: 'Local — all external services mocked' }],
  dev:   [{ url: 'http://localhost:3000', description: 'Dev — real sandbox services' }],
  uat:   [{ url: 'https://uat.nexusbid.com', description: 'UAT server' }],
  prod:  [{ url: 'https://api.nexusbid.com', description: 'Production' }],
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'NexusBid API',
      version: '1.0.0',
      description: `
# NexusBid — USA Government RFP/Tender Marketplace REST API

A production-ready REST API for browsing, purchasing, and managing USA government RFP/Tender notices.

## Authentication

This API uses **HTTP-only cookie authentication** — NOT Bearer tokens.

| Cookie | Purpose | TTL |
|--------|---------|-----|
| \`nexusbid_token\` | JWT access token (customers: 7d, admins: 4h) | Set on login |
| \`nexusbid_refresh\` | Refresh token for session rotation | Set on login |

**Authentication Flow:**
1. \`GET /api/v1/auth/csrf-token\` — obtain CSRF token
2. \`POST /api/v1/auth/login\` — cookies set automatically in response
3. Include \`x-csrf-token\` header on all state-mutating requests (POST/PATCH/PUT/DELETE)
4. \`POST /api/v1/auth/refresh\` — rotate tokens before expiry
5. \`POST /api/v1/auth/logout\` — clears cookies server-side

> **Swagger UI limitation:** Browsers cannot directly set HTTP-only cookies. When testing in Swagger UI, use \`local\` environment where CSRF is disabled and cookies can be set via the browser on \`http://localhost:3000\`.

## RBAC

Admin endpoints require both an admin account type AND specific permission keys.
Each endpoint description lists the required permissions.

## Rate Limits

| Endpoint group | Limit |
|---|---|
| Global API | 300 requests / 15 min per IP |
| Login | 10 requests / 1 min per IP |
| Register | 5 requests / 1 hr per IP |
| Password reset | 5 requests / 1 hr per IP |
| Download URL | 10 requests / 1 hr per user |

## Response Envelope

All responses use a consistent envelope:
\`\`\`json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 },
  "traceId": "uuid-for-support"
}
\`\`\`

## Environments

| ENV | External Services | Swagger |
|-----|------------------|---------|
| local | Mocked (no real AWS/PayPal/email) | ✅ |
| dev | Real sandbox services | ✅ |
| uat | Real sandbox services | ❌ |
| prod | Real live services | ❌ |
      `.trim(),
      contact: {
        name: 'NexusBid Engineering',
        email: 'engineering@nexusbid.com',
      },
    },
    servers: serverUrls[env.NODE_ENV] ?? serverUrls['local'],

    // ─── Security Schemes ─────────────────────────────────────────────────────
    components: {
      securitySchemes: {
        /**
         * Primary auth: HTTP-only JWT cookie set by POST /auth/login.
         * Swagger UI cannot set HttpOnly cookies — test via browser session.
         */
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'nexusbid_token',
          description: 'HTTP-only JWT access token. Set automatically on login. Customers: 7-day TTL. Admins: 4-hour TTL.',
        },
        /**
         * Refresh cookie: used only by POST /auth/refresh.
         */
        refreshCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'nexusbid_refresh',
          description: 'HTTP-only refresh token. Used exclusively by POST /api/v1/auth/refresh to rotate the session.',
        },
        /**
         * CSRF protection: required on all state-mutating requests except webhooks.
         * Obtain via GET /api/v1/auth/csrf-token.
         * Disabled in local environment.
         */
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token. Obtain from GET /api/v1/auth/csrf-token. Required on POST/PATCH/PUT/DELETE in dev/uat/prod. Disabled in local env.',
        },
      },

      // ─── Reusable Schemas ───────────────────────────────────────────────────
      schemas: {

        // ── Envelopes ──────────────────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { description: 'Response payload — null for operations with no data' },
            traceId: { type: 'string', format: 'uuid', description: 'Unique request trace ID for support' },
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['success', 'message', 'error'],
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'An unexpected error occurred' },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR',
              description: 'Machine-readable error code',
              enum: [
                'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'SESSION_REVOKED',
                'ACCOUNT_NOT_FOUND', 'ACCOUNT_BLOCKED', 'FORCED_PASSWORD_RESET', 'PASSWORD_EXPIRED',
                'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'FK_VIOLATION',
                'VALIDATION_ERROR', 'RATE_LIMITED', 'CSRF_INVALID',
                'INTERNAL_ERROR', 'PERMISSION_LOAD_FAILED',
              ],
            },
            errors: {
              type: 'array',
              nullable: true,
              description: 'Field-level validation errors (only present on 422)',
              items: {
                type: 'object',
                required: ['field', 'message'],
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email address' },
                },
              },
            },
            traceId: { type: 'string', format: 'uuid' },
          },
        },

        // ── Pagination ─────────────────────────────────────────────────────────
        PaginationMeta: {
          type: 'object',
          required: ['total', 'page', 'limit', 'totalPages'],
          properties: {
            total: { type: 'integer', example: 250, description: 'Total number of records matching the query' },
            page: { type: 'integer', example: 1, description: 'Current page number (1-indexed)' },
            limit: { type: 'integer', example: 20, description: 'Records per page' },
            totalPages: { type: 'integer', example: 13, description: 'Total pages available' },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },

        // ── Auth ──────────────────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 120,
              example: 'Jane Doe',
              description: 'Full name (2–120 characters)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane@example.com',
              description: 'Valid email address — automatically lowercased',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePass123!',
              description: 'Min 8 chars, must include at least one uppercase letter and one number',
              pattern: '^(?=.*[A-Z])(?=.*[0-9]).{8,}$',
            },
            companyName: {
              type: 'string',
              maxLength: 160,
              nullable: true,
              example: 'Acme Corp',
              description: 'Optional company or organization name',
            },
            country: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'United States',
              description: 'Optional country of residence',
            },
          },
        },

        RegisterAdminRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 120, example: 'Admin User' },
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecureAdmin1!',
              pattern: '^(?=.*[A-Z])(?=.*[0-9]).{8,}$',
            },
            companyName: { type: 'string', maxLength: 160, nullable: true },
            country: { type: 'string', maxLength: 100, nullable: true },
          },
        },

        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', example: 'SecurePass123!', description: 'Minimum 1 character (validation is intentionally permissive to avoid enumeration)' },
            rememberMe: {
              type: 'boolean',
              default: false,
              description: 'When true, extends access token TTL',
              nullable: true,
            },
            captchaToken: {
              type: 'string',
              nullable: true,
              description: 'Cloudflare Turnstile token — required when bot protection is enabled',
            },
          },
        },

        AuthUser: {
          type: 'object',
          required: ['id', 'name', 'email', 'accountType', 'emailVerified'],
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            accountType: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user',
              description: 'Account type — determines RBAC applicability',
            },
            emailVerified: { type: 'boolean', example: true },
            status: {
              type: 'string',
              enum: ['pending_email_verification', 'pending_approval', 'active', 'rejected', 'suspended', 'deactivated', 'archived'],
              example: 'active',
            },
            companyName: { type: 'string', nullable: true, example: 'Acme Corp' },
            country: { type: 'string', nullable: true, example: 'United States' },
            mustResetPassword: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        MeResponse: {
          allOf: [
            { '$ref': '#/components/schemas/AuthUser' },
            {
              type: 'object',
              properties: {
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['tender-reviewer'],
                  description: 'Active role slugs — only populated for admin accounts',
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['tender.create', 'tender.edit'],
                  description: 'Resolved permission keys from all active roles',
                },
              },
            },
          ],
        },

        SessionItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userAgent: { type: 'string', nullable: true, example: 'Mozilla/5.0 ...' },
            ipAddress: { type: 'string', nullable: true, example: '192.168.1.1' },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            isCurrent: { type: 'boolean', description: 'True if this is the caller\'s current session' },
          },
        },

        DeviceItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userAgent: { type: 'string', nullable: true },
            ipAddress: { type: 'string', nullable: true },
            isTrusted: { type: 'boolean' },
            lastSeenAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ── Tenders ──────────────────────────────────────────────────────────
        TenderPreview: {
          type: 'object',
          description: 'Publicly visible tender preview — no subscription required',
          required: ['id', 'title', 'slug'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Road Resurfacing Project Phase 2' },
            slug: { type: 'string', example: 'road-resurfacing-project-phase-2-ref-12345' },
            agency: { type: 'string', example: 'CDOT — Colorado Dept of Transportation', nullable: true },
            deadline: { type: 'string', format: 'date-time', nullable: true },
            postedDate: { type: 'string', format: 'date', nullable: true },
            isFeatured: { type: 'boolean', example: false },
            priceCents: { type: 'integer', example: 999, description: 'Per-tender purchase price in USD cents' },
            categoryId: { type: 'string', format: 'uuid', nullable: true },
            stateId: { type: 'string', format: 'uuid', nullable: true },
            lifecycleStatus: {
              type: 'string',
              enum: ['ACTIVE', 'ARCHIVED', 'CANCELLED'],
              example: 'ACTIVE',
            },
            publicationStatus: {
              type: 'string',
              enum: ['SCHEDULED', 'PUBLISHED', 'OPEN', 'CLOSING', 'CLOSED', 'AWARDED', 'COMPLETED'],
              example: 'OPEN',
            },
            submissionType: {
              type: 'string',
              enum: ['digital', 'physical', 'both'],
              example: 'digital',
            },
          },
        },

        TenderDetail: {
          allOf: [
            { '$ref': '#/components/schemas/TenderPreview' },
            {
              type: 'object',
              description: 'Full detail — requires active subscription or individual purchase',
              properties: {
                refNumber: { type: 'string', nullable: true, example: 'DOT-2024-CO-001' },
                description: { type: 'string', nullable: true },
                eligibility: { type: 'string', nullable: true },
                contactInfo: { type: 'string', nullable: true },
                city: { type: 'string', nullable: true },
                documentOriginalName: { type: 'string', nullable: true, example: 'rfp-document.pdf' },
                hasDocument: { type: 'boolean', example: true, description: 'Whether a PDF document is attached' },
                downloadUrl: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  description: 'Pre-signed S3 URL valid for 15 minutes — only present when caller has access',
                },
              },
            },
          ],
        },

        // ── Subscriptions ──────────────────────────────────────────────────────
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Monthly Pro' },
            priceCents: { type: 'integer', example: 2999, description: 'Price in USD cents' },
            durationDays: { type: 'integer', example: 30 },
            isRecurring: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true },
            features: { type: 'object', additionalProperties: true },
          },
        },

        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            planId: { type: 'string', format: 'uuid' },
            planName: { type: 'string', example: 'Monthly Pro' },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'cancelled'],
              example: 'active',
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            autoRenew: { type: 'boolean', example: true },
          },
        },

        // ── Common field-level reusables ───────────────────────────────────────
        UuidParam: {
          type: 'string',
          format: 'uuid',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },

      // ── Reusable Parameters ───────────────────────────────────────────────────
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number (1-indexed)',
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          description: 'Records per page (max 50)',
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          schema: { type: 'string', maxLength: 200 },
          description: 'Full-text search query',
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          schema: { type: 'string', example: 'createdAt' },
          description: 'Field to sort by',
        },
        OrderParam: {
          name: 'order',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          description: 'Sort direction',
        },
        DateFromParam: {
          name: 'dateFrom',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'Filter: start date (inclusive), format YYYY-MM-DD',
        },
        DateToParam: {
          name: 'dateTo',
          in: 'query',
          schema: { type: 'string', format: 'date' },
          description: 'Filter: end date (inclusive), format YYYY-MM-DD',
        },
        IdPathParam: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Resource UUID',
        },
      },

      // ── Reusable Responses ────────────────────────────────────────────────────
      responses: {
        Unauthorized: {
          description: 'Authentication required — no valid session cookie found',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              examples: {
                noToken: {
                  summary: 'No session cookie',
                  value: { success: false, message: 'Authentication required', error: 'UNAUTHENTICATED', traceId: 'uuid' },
                },
                expired: {
                  summary: 'Token expired',
                  value: { success: false, message: 'Access token expired', error: 'TOKEN_EXPIRED', traceId: 'uuid' },
                },
                revoked: {
                  summary: 'Session revoked',
                  value: { success: false, message: 'Session has been revoked', error: 'SESSION_REVOKED', traceId: 'uuid' },
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but insufficient permissions',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Forbidden: Insufficient Permissions', error: 'FORBIDDEN', traceId: 'uuid' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Resource not found', error: 'NOT_FOUND', traceId: 'uuid' },
            },
          },
        },
        Conflict: {
          description: 'Resource already exists (unique constraint violation)',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'A record with this value already exists', error: 'CONFLICT', traceId: 'uuid' },
            },
          },
        },
        ValidationError: {
          description: 'Request body failed Zod schema validation',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                errors: [{ field: 'email', message: 'Invalid email' }, { field: 'password', message: 'Password must contain at least one uppercase letter' }],
                traceId: 'uuid',
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests — rate limit exceeded',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Too many requests. Slow down.', error: 'RATE_LIMITED', traceId: 'uuid' },
            },
          },
        },
        CsrfInvalid: {
          description: 'CSRF token missing or invalid',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'CSRF validation failed. Refresh the page and try again.', error: 'CSRF_INVALID', traceId: 'uuid' },
            },
          },
        },
        InternalError: {
          description: 'Unexpected server error',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'An unexpected error occurred', error: 'INTERNAL_ERROR', traceId: 'uuid' },
            },
          },
        },
      },
    },

    // ── No global security — each endpoint declares its own ────────────────────
    security: [],

    tags: [
      { name: 'Health',        description: 'System health and readiness checks' },
      { name: 'Auth',          description: 'Customer authentication — login, register, email verification, password reset, sessions, devices, OAuth' },
      { name: 'Admin Auth',    description: 'Admin-specific authentication — separate login flow, bootstrap, owner review' },
      { name: 'Profile',       description: 'Authenticated user profile management' },
      { name: 'Tenders',       description: 'Public tender browsing, search, and Q&A' },
      { name: 'Tenders Admin', description: 'Admin tender CRUD, workflow, reviews, assignments — requires admin account + permissions' },
      { name: 'Subscriptions', description: 'Subscription status and PayPal checkout for customers' },
      { name: 'Plans',         description: 'Public plan listing and admin plan management' },
      { name: 'Admin Users',   description: 'Admin user management — list, block, impersonate, roles, notes' },
      { name: 'RBAC',          description: 'Role-Based Access Control — roles, permissions, version workflow' },
      { name: 'Categories',    description: 'Tender category taxonomy — public read, admin write' },
      { name: 'States',        description: 'US states and territories reference data' },
      { name: 'Support',       description: 'Customer support ticket system' },
      { name: 'Notifications', description: 'In-app notification management' },
      { name: 'Analytics',     description: 'BI analytics — revenue, rollups, exports, scheduled reports' },
      { name: 'Dashboard',     description: 'Dashboard summary data aggregation' },
      { name: 'Audit Logs',    description: 'Immutable audit trail, exports, security alert scanner' },
      { name: 'Webhooks',      description: 'PayPal webhook ingestion — internal use only, no CSRF' },
      { name: 'Setup',         description: 'First-time system bootstrap wizard' },
    ],
  },

  // Scan all route files + app.ts (health check)
  apis: [
    './src/modules/**/*.routes.ts',
    './src/config/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerMiddleware: RequestHandler[] = [
  swaggerUi.serve as unknown as RequestHandler,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'NexusBid API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      // Cookie auth cannot be set via Swagger UI — document the flow instead
      displayRequestDuration: true,
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customCss: `
      .swagger-ui .topbar { background-color: #1e293b; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before {
        content: '🏛️  NexusBid API';
        color: white;
        font-size: 18px;
        font-weight: 700;
      }
      .swagger-ui .info .description p { font-size: 14px; }
    `,
  }) as unknown as RequestHandler,
];
