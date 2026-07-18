import { v4 as uuidv4 } from 'uuid';

import { AppDataSource } from '../config/database';
import { asyncHandler } from '../core/asyncHandler';
import { AuditLog } from '../database/entities/AuditLog';

import type { NextFunction, Request, Response } from 'express';

const auditLogRepository = AppDataSource.getRepository(AuditLog);

function buildAuditLogPayload(
  req: Request,
  res: Response,
  action: string,
  module: string,
  responseBody: Record<string, unknown>,
) {
  const { user } = req;
  return {
    eventId: uuidv4(),
    actorId: user ? user.userId : null,
    actorEmail: user ? user.email : 'unknown',
    action,
    module,
    entityId: req.params['id'] ?? null,
    before: (res.locals['auditBefore'] as unknown) ?? null,
    after: responseBody.data ?? null,
    requestId: req.requestId ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
}

/**
 * Middleware factory that logs admin actions to the audit_logs table.
 * Logging is non-blocking (setImmediate) and does not affect response time.
 * The before state must be captured in the route handler and passed via res.locals.
 *
 * Usage:
 *   router.patch('/:id',
 *     authenticate,
 *     requirePermission(PermissionKey.EDIT_TENDER),
 *     auditLogger('edit', 'tender'),
 *     controller.update,
 *   );
 *
 * To capture the 'before' state in the controller:
 *   res.locals.auditBefore = { status: tender.status };
 */
export const auditLogger = (action: string, module: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (responseBody: Record<string, unknown>) => {
      // Non-blocking — does not delay the response
      setImmediate(() => {
        const payload = buildAuditLogPayload(req, res, action, module, responseBody);
        void auditLogRepository.save(payload).catch(() => {
          // Silently fail — audit logging should never crash the app
        });
      });

      return originalJson(responseBody);
    };

    next();
  });
