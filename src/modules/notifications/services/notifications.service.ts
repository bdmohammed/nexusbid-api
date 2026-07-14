import type { Response } from "express";
import { AppDataSource } from "../../../config/database";
import { Notification } from "../../../database/entities/Notification";
import { NotificationRecipient } from "../../../database/entities/NotificationRecipient";
import { NotificationAction } from "../../../database/entities/NotificationAction";
import type { User } from "../../../database/entities/User";
import { UserRole } from "../../../database/entities/UserRole";
import { domainEvents, TENDER_EVENTS } from "../../../utils/domainEvents";
import { rbacEventEmitter } from "../../rbac/events/RbacEvents";
import { logger } from "../../../config/logger";

// ─── SSE Client Registry ──────────────────────────────────────────────────────
export interface SSEClient {
  userId: string;
  res: Response;
}

export const sseClients: SSEClient[] = [];

export function registerSSEClient(userId: string, res: Response) {
  sseClients.push({ userId, res });
  logger.info({ userId }, "SSE client registered");
}

export function unregisterSSEClient(res: Response) {
  const index = sseClients.findIndex((c) => c.res === res);
  if (index !== -1) {
    const client = sseClients[index];
    sseClients.splice(index, 1);
    logger.info({ userId: client.userId }, "SSE client unregistered");
  }
}

// ─── Broadcasters ─────────────────────────────────────────────────────────────
export function broadcastToUser(userId: string, eventName: string, data: any) {
  const clients = sseClients.filter((c) => c.userId === userId);
  clients.forEach((c) => {
    try {
      c.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      logger.error({ err, userId }, "Error writing to SSE stream");
    }
  });
}

export async function broadcastNotification(notificationId: string) {
  const notifRepo = AppDataSource.getRepository(Notification);
  const userRoleRepo = AppDataSource.getRepository(UserRole);

  const notif = await notifRepo.findOne({
    where: { id: notificationId },
    relations: ["recipients", "actions"],
  });

  if (!notif) return;

  // Resolve target users
  const targetUserIds = new Set<string>();

  for (const recipient of notif.recipients) {
    if (recipient.userId) {
      targetUserIds.add(recipient.userId);
    } else if (recipient.roleId) {
      const userRoles = await userRoleRepo.find({
        where: { roleId: recipient.roleId },
      });
      userRoles.forEach((ur) => targetUserIds.add(ur.userId));
    } else if (recipient.groupName === "everyone") {
      // Broadcast to all active SSE users
      sseClients.forEach((c) => targetUserIds.add(c.userId));
    }
  }

  targetUserIds.forEach((uid) => {
    broadcastToUser(uid, "notification:new", {
      ...notif,
      // Map user-specific status inside the payload
      status: "UNREAD",
    });
  });
}

// ─── Notification Creator ──────────────────────────────────────────────────────
export async function createNotification(params: {
  category: string;
  severity: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  expiresAt?: Date | null;
  metadata?: any | null;
  recipients: Array<{ userId?: string; roleId?: string; groupName?: string }>;
  actions?: Array<{
    label: string;
    type: string;
    payload?: any;
    permission?: string;
    btnOrder?: number;
  }>;
}): Promise<Notification> {
  return AppDataSource.transaction(async (manager) => {
    const notif = manager.create(Notification, {
      category: params.category,
      severity: params.severity,
      title: params.title,
      message: params.message,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      actionUrl: params.actionUrl ?? null,
      actionLabel: params.actionLabel ?? null,
      expiresAt: params.expiresAt ?? null,
      metadata: params.metadata ?? null,
    });

    const savedNotif = await manager.save(Notification, notif);

    // Save Recipients
    const recipientsList = params.recipients.map((r) =>
      manager.create(NotificationRecipient, {
        notificationId: savedNotif.id,
        userId: r.userId ?? null,
        roleId: r.roleId ?? null,
        groupName: r.groupName ?? null,
        status: "UNREAD",
      }),
    );
    await manager.save(NotificationRecipient, recipientsList);

    // Save Actions
    if (params.actions && params.actions.length > 0) {
      const actionsList = params.actions.map((a) =>
        manager.create(NotificationAction, {
          notificationId: savedNotif.id,
          label: a.label,
          type: a.type,
          payload: a.payload ?? null,
          permission: a.permission ?? null,
          btnOrder: a.btnOrder ?? 0,
        }),
      );
      await manager.save(NotificationAction, actionsList);
    }

    // Trigger SSE broadcast in background
    setImmediate(() => {
      broadcastNotification(savedNotif.id).catch((err) => {
        logger.error({ err }, "Error broadcasting notification");
      });
    });

    return savedNotif;
  });
}

// ─── Setup Listeners ──────────────────────────────────────────────────────────
export function setupNotificationListeners() {
  logger.info("Initializing notification listeners");

  // 1. Tender submitted (Needs Review)
  domainEvents.on(TENDER_EVENTS.SUBMITTED, async (event: any) => {
    try {
      const tender = event.tender;
      const title = "Tender Submitted";
      const message = `Tender Reference ${tender.referenceNo} is pending approval review.`;

      // Find reviewer role or assign to group everyone / support
      await createNotification({
        category: "review",
        severity: "high",
        title,
        message,
        entityType: "Tender",
        entityId: tender.id,
        actionUrl: `/tenders/${tender.id}/review`,
        actionLabel: "Review Tender",
        recipients: [{ groupName: "everyone" }], // Broadcast to all admins
        actions: [
          {
            label: "Approve",
            type: "TENDER_APPROVE",
            payload: { tenderId: tender.id },
            permission: "approve_tender",
            btnOrder: 1,
          },
          {
            label: "Reject",
            type: "TENDER_REJECT",
            payload: { tenderId: tender.id },
            permission: "approve_tender",
            btnOrder: 2,
          },
        ],
      });
    } catch (err) {
      logger.error({ err }, "Error handling TENDER_SUBMITTED notification");
    }
  });

  // 2. Tender approved
  domainEvents.on(TENDER_EVENTS.APPROVED, async (event: any) => {
    try {
      const tender = event.tender;
      const title = "Tender Approved";
      const message = `Tender Reference ${tender.referenceNo} has been successfully approved and scheduled/published.`;

      await createNotification({
        category: "tender",
        severity: "info",
        title,
        message,
        entityType: "Tender",
        entityId: tender.id,
        actionUrl: `/tenders/${tender.id}`,
        actionLabel: "View Tender",
        recipients: [{ userId: tender.createdById }], // Send to submitter
      });
    } catch (err) {
      logger.error({ err }, "Error handling TENDER_APPROVED notification");
    }
  });

  // 3. Role version submitted for review
  rbacEventEmitter.on("RoleSubmitted", async (event: any) => {
    try {
      const title = "Role Request Submitted";
      const message = `Role "${event.roleName}" version ${event.version} submitted by user.`;

      // Target admins/reviewers
      await createNotification({
        category: "review",
        severity: "medium",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        actionUrl: `/roles/${event.roleId}/review`,
        actionLabel: "Review Role",
        recipients: [{ groupName: "everyone" }],
        actions: [
          {
            label: "Approve",
            type: "ROLE_APPROVE",
            payload: { roleId: event.roleId, version: event.version },
            permission: "assign_permissions",
            btnOrder: 1,
          },
          {
            label: "Reject",
            type: "ROLE_REJECT",
            payload: { roleId: event.roleId, version: event.version },
            permission: "assign_permissions",
            btnOrder: 2,
          },
        ],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleSubmitted notification");
    }
  });

  // 4. Role approved
  rbacEventEmitter.on("RoleApproved", async (event: any) => {
    try {
      const title = "Role Approved";
      const message = `Role "${event.roleName}" version ${event.version} has been approved.`;

      await createNotification({
        category: "role",
        severity: "info",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        actionUrl: `/roles/${event.roleId}`,
        actionLabel: "View Role",
        recipients: [{ userId: event.userId }],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleApproved notification");
    }
  });

  // 5. Role rejected
  rbacEventEmitter.on("RoleRejected", async (event: any) => {
    try {
      const title = "Role Rejected";
      const message = `Role "${event.roleName}" version ${event.version} has been rejected.`;

      await createNotification({
        category: "role",
        severity: "high",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        recipients: [{ userId: event.userId }],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleRejected notification");
    }
  });

  // 6. Role Created Draft
  rbacEventEmitter.on("RoleCreated", async (event: any) => {
    try {
      const title = "New Role Created";
      const message = `A new role "${event.roleName}" has been created as a draft.`;

      await createNotification({
        category: "role",
        severity: "low",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        recipients: [{ groupName: "everyone" }],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleCreated notification");
    }
  });

  // 7. Role Reopened
  rbacEventEmitter.on("RoleReopened", async (event: any) => {
    try {
      const title = "Role Review Reopened";
      const message = `Role "${event.roleName}" (V${event.version}) review workflow has been reopened.`;

      await createNotification({
        category: "role",
        severity: "medium",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        recipients: [{ userId: event.userId }],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleReopened notification");
    }
  });

  // 8. Role Archived
  rbacEventEmitter.on("RoleArchived", async (event: any) => {
    try {
      const title = "Role Archived";
      const message = `Role "${event.roleName}" has been archived.`;

      await createNotification({
        category: "role",
        severity: "info",
        title,
        message,
        entityType: "Role",
        entityId: event.roleId,
        recipients: [{ groupName: "everyone" }],
      });
    } catch (err) {
      logger.error({ err }, "Error handling RoleArchived notification");
    }
  });
}
