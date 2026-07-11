import { appDataSource } from '../../../config/database';
import { AppError } from '../../../core/AppError';
import { NotificationAction } from '../../../entities/NotificationAction';
import { NotificationRecipient } from '../../../entities/NotificationRecipient';
import { RoleReview } from '../../../entities/RoleReview';
import { UserRole } from '../../../entities/UserRole';
import { TenderVersionStatus } from '../../../types/enums';
import { RbacService } from '../../rbac/rbac.service';
import { updateTenderStatus } from '../../tenders/tenders.service';
import { registerSSEClient, unregisterSSEClient } from '../services/notifications.service';

import type { NextFunction, Request, Response } from 'express';

// Helpers to get user role IDs
async function getUserRoleIds(userId: string): Promise<string[]> {
  const userRoleRepo = appDataSource.getRepository(UserRole);
  const userRoles = await userRoleRepo.find({ where: { userId } });
  return userRoles.map((ur) => ur.roleId);
}

// ─── Get Notifications List ──────────────────────────────────────────────────
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const limit = parseInt((req.query['limit'] as string) ?? '20', 10);
    const status = req.query['status'] as string; // UNREAD, READ, ARCHIVED, DISMISSED
    const category = req.query['category'] as string;
    const severity = req.query['severity'] as string;

    const roleIds = await getUserRoleIds(req.user.userId);
    const recipRepo = appDataSource.getRepository(NotificationRecipient);

    const qb = recipRepo
      .createQueryBuilder('recipient')
      .leftJoinAndSelect('recipient.notification', 'notification')
      .leftJoinAndSelect('notification.actions', 'actions')
      .where(
        `(recipient.userId = :userId OR recipient.groupName = :everyone${
          roleIds.length > 0 ? ' OR recipient.roleId IN (:...roleIds)' : ''
        })`,
        {
          userId: req.user.userId,
          everyone: 'everyone',
          roleIds,
        },
      );

    if (status) {
      qb.andWhere('recipient.status = :status', { status });
    } else {
      qb.andWhere('recipient.status != :dismissed', { dismissed: 'DISMISSED' });
    }

    if (category) {
      qb.andWhere('notification.category = :category', { category });
    }

    if (severity) {
      qb.andWhere('notification.severity = :severity', { severity });
    }

    // Enterprise Priority Queue Sorting using addSelect aliases to bypass TypeORM parser
    qb.addSelect(
      `CASE 
      WHEN notification.severity = 'critical' THEN 1 
      WHEN notification.severity = 'high' THEN 2 
      WHEN notification.severity = 'medium' THEN 3
      WHEN notification.severity = 'low' THEN 4
      ELSE 5 
    END`,
      'severity_priority',
    )
      .addSelect("CASE WHEN recipient.status = 'UNREAD' THEN 1 ELSE 2 END", 'status_priority')
      .orderBy('severity_priority', 'ASC')
      .addOrderBy('status_priority', 'ASC')
      .addOrderBy('notification.createdAt', 'DESC');

    const [recipients, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Map output to include notification details at high level
    const notifications = recipients.map((r) => ({
      id: r.notificationId,
      recipientId: r.id,
      status: r.status,
      readAt: r.readAt,
      createdAt: r.createdAt,
      title: r.notification.title,
      message: r.notification.message,
      category: r.notification.category,
      severity: r.notification.severity,
      entityType: r.notification.entityType,
      entityId: r.notification.entityId,
      actionUrl: r.notification.actionUrl,
      actionLabel: r.notification.actionLabel,
      metadata: r.notification.metadata,
      actions: r.notification.actions,
    }));

    res.json({
      notifications,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get Statistics ───────────────────────────────────────────────────────────
export async function getStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const roleIds = await getUserRoleIds(req.user.userId);
    const recipRepo = appDataSource.getRepository(NotificationRecipient);

    const qb = recipRepo
      .createQueryBuilder('recipient')
      .leftJoin('recipient.notification', 'notification')
      .where(
        `(recipient.userId = :userId OR recipient.groupName = :everyone${
          roleIds.length > 0 ? ' OR recipient.roleId IN (:...roleIds)' : ''
        })`,
        {
          userId: req.user.userId,
          everyone: 'everyone',
          roleIds,
        },
      );

    const counts = await qb
      .select('recipient.status', 'status')
      .addSelect('notification.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('recipient.status')
      .addGroupBy('notification.severity')
      .getRawMany();

    let unreadCount = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    counts.forEach((c) => {
      const count = parseInt(c.count, 10);
      if (c.status === 'UNREAD') {
        unreadCount += count;
      }
      if (c.severity === 'critical') {
        criticalCount += count;
      } else if (c.severity === 'high' ?? c.severity === 'medium') {
        warningCount += count;
      } else {
        infoCount += count;
      }
    });

    res.json({
      unread: unreadCount,
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Mark Read/Archive/Dismiss Actions ─────────────────────────────────────────
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const { id } = req.params;

    const recipRepo = appDataSource.getRepository(NotificationRecipient);
    const recipient = await recipRepo.findOne({
      where: { notificationId: id, userId: req.user.userId },
    });

    if (!recipient) throw new AppError('Notification not found', 404, 'NOT_FOUND');

    recipient.status = 'READ';
    recipient.readAt = new Date();
    await recipRepo.save(recipient);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

    const recipRepo = appDataSource.getRepository(NotificationRecipient);
    await recipRepo.update(
      { userId: req.user.userId, status: 'UNREAD' },
      { status: 'READ', readAt: new Date() },
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function archiveNotification(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const { id } = req.params;

    const recipRepo = appDataSource.getRepository(NotificationRecipient);
    const recipient = await recipRepo.findOne({
      where: { notificationId: id, userId: req.user.userId },
    });

    if (!recipient) throw new AppError('Notification not found', 404, 'NOT_FOUND');

    recipient.status = 'ARCHIVED';
    await recipRepo.save(recipient);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function dismissNotification(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const { id } = req.params;

    const recipRepo = appDataSource.getRepository(NotificationRecipient);
    const recipient = await recipRepo.findOne({
      where: { notificationId: id, userId: req.user.userId },
    });

    if (!recipient) throw new AppError('Notification not found', 404, 'NOT_FOUND');

    recipient.status = 'DISMISSED';
    await recipRepo.save(recipient);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Execute Smart Action (Decoupled Delegation) ──────────────────────────────
export async function executeAction(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    const { id, actionId } = req.params;

    const actionRepo = appDataSource.getRepository(NotificationAction);
    const recipRepo = appDataSource.getRepository(NotificationRecipient);

    const action = await actionRepo.findOne({
      where: { id: actionId, notificationId: id },
      relations: ['notification'],
    });

    if (!action) {
      throw new AppError('Action not found', 404, 'NOT_FOUND');
    }

    // Re-check action validation permissions
    if (action.permission) {
      const userPermissions = req.permissions ?? [];
      if (!userPermissions.includes(action.permission)) {
        throw new AppError(
          'Access Denied: Insufficient privilege to execute action.',
          403,
          'FORBIDDEN',
        );
      }
    }

    const payload = action.payload ?? {};

    // Decoupled delegation boundary
    if (action.type === 'TENDER_APPROVE') {
      await updateTenderStatus(
        payload.tenderId,
        { status: TenderVersionStatus.APPROVED },
        req.user.userId,
      );
    } else if (action.type === 'TENDER_REJECT') {
      await updateTenderStatus(
        payload.tenderId,
        { status: TenderVersionStatus.REJECTED },
        req.user.userId,
      );
    } else if (action.type === 'ROLE_APPROVE') {
      const reviewRepo = appDataSource.getRepository(RoleReview);
      const review = await reviewRepo.findOne({
        where: { roleId: payload.roleId, roleVersion: { version: payload.version } },
      });
      if (!review) throw new AppError('Role review workflow not found', 404, 'NOT_FOUND');
      await RbacService.reviewRoleVersion(
        review.id,
        'APPROVED',
        'Approved via quick action.',
        req.user.userId,
      );
    } else if (action.type === 'ROLE_REJECT') {
      const reviewRepo = appDataSource.getRepository(RoleReview);
      const review = await reviewRepo.findOne({
        where: { roleId: payload.roleId, roleVersion: { version: payload.version } },
      });
      if (!review) throw new AppError('Role review workflow not found', 404, 'NOT_FOUND');
      await RbacService.reviewRoleVersion(
        review.id,
        'REJECTED',
        'Rejected via quick action.',
        req.user.userId,
      );
    } else {
      throw new AppError('Unsupported action execution type', 400, 'BAD_REQUEST');
    }

    // Resolve recipient status to READ once completed
    const recipient = await recipRepo.findOne({
      where: { notificationId: id, userId: req.user.userId },
    });
    if (recipient) {
      recipient.status = 'READ';
      recipient.readAt = new Date();
      await recipRepo.save(recipient);
    }

    res.json({ success: true, message: 'Action successfully resolved' });
  } catch (err) {
    next(err);
  }
}

// ─── SSE Notification Stream ──────────────────────────────────────────────────
export async function initializeNotificationStream(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).write('Unauthorized');
    res.end();
    return;
  }

  const { userId } = req.user;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  registerSSEClient(userId, res);

  // Send initial ping/connection state
  res.write('event: ping\ndata: connected\n\n');

  req.on('close', () => {
    unregisterSSEClient(res);
  });
}

// ─── Categories & Preferences ──────────────────────────────────────────────────
export function getCategories(req: Request, res: Response) {
  const categories = [
    { key: 'review', label: 'Review Queue' },
    { key: 'security', label: 'Security & Compliance' },
    { key: 'tender', label: 'Tenders & Bidding' },
    { key: 'user', label: 'User Operations' },
    { key: 'role', label: 'Roles & RBAC' },
    { key: 'subscription', label: 'Subscriptions' },
    { key: 'payment', label: 'Billing & Payments' },
    { key: 'analytics', label: 'BI & Analytics' },
    { key: 'system', label: 'System Health' },
    { key: 'reminder', label: 'Reminders' },
  ];
  res.json(categories);
}

export function getPreferences(req: Request, res: Response) {
  // Stub user notification preferences
  res.json({
    email: { review: true, security: true, system: false },
    inApp: { review: true, security: true, system: true },
  });
}

export function updatePreferences(req: Request, res: Response) {
  // Stub update preference status
  res.json({ success: true, updated: req.body });
}
