import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { asyncHandler } from '../core/asyncHandler';

const auditLogRepo = AppDataSource.getRepository(AuditLog);

/**
 * Middleware factory that logs admin actions to the audit_logs table.
 * Logging is non-blocking (setImmediate) and does not affect response time.
 * The before state must be captured in the route handler and passed via res.locals.
 *
 * Usage:
 *   router.patch('/:id',
 *     authenticate,
 *     requirePermission(PermissionKey.EDIT_TENDER),
 *     auditLogger('tender.edit', 'tender'),
 *     controller.update,
 *   );
 *
 * To capture the 'before' state in the controller:
 *   res.locals.auditBefore = { status: tender.status };
 */
export const auditLogger = (action: string, entityType: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (data: unknown) => {
      // Non-blocking — does not delay the response
      setImmediate(() => {
        auditLogRepo
          .save({
            actorId: req.user?.userId ?? null,
            actorEmail: req.user?.email ?? 'unknown',
            action,
            entityType,
            entityId: req.params['id'] ?? null,
            before: (res.locals['auditBefore'] as Record<string, unknown>) ?? null,
            after: (data as Record<string, unknown>)?.['data'] ?? null,
            requestId: req.requestId ?? null,
            userAgent: req.headers['user-agent'] ?? null,
            ipAddress: req.ip ?? null,
          })
          .catch(() => {
            // Silently fail — audit logging should never crash the app
          });
      });

      return originalJson(data);
    };

    next();
  });
