import { AppDataSource } from '../../../config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../../core/AppError';
import { asyncHandler } from '../../../core/asyncHandler';
import { NotificationAction } from '../../../database/entities/NotificationAction';
import { NotificationRecipient } from '../../../database/entities/NotificationRecipient';
import { RoleReview } from '../../../database/entities/RoleReview';
import { UserRole } from '../../../database/entities/UserRole';
import {
  NotificationActionType,
  NotificationRecipientStatus,
  TenderVersionStatus,
} from '../../../types/enums';
import { RbacService } from '../../rbac/rbac.service';
import { updateTenderStatus } from '../../tenders/tenders.service';
import { registerSSEClient, unregisterSSEClient } from '../services/notifications.service';

import type {
  ExecuteActionParamsDto,
  GetNotificationsQueryDto,
  NotificationIdParamDto,
  UpdatePreferencesBodyDto,
} from './notifications.dto';

// Helpers to get user role IDs
async function getUserRoleIds(userId: string): Promise<string[]> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const userRoles = await userRoleRepo.find({ where: { userId } });
  return userRoles.map((ur) => ur.roleId);
}

// ─── Get Notifications List ──────────────────────────────────────────────────
export const getNotifications = asyncHandler<{}, {}, {}, GetNotificationsQueryDto>(
  async (req, res) => {
    if (!req.user)
      throw new AppError(
        AppErrorMessage.UNAUTHORIZED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHORIZED,
      );

    const { page, limit, status, category, severity } = req.query;

    const roleIds = await getUserRoleIds(req.user.userId);
    const recipRepo = AppDataSource.getRepository(NotificationRecipient);

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
      metadata: r.notification.metadata,
      actions: r.notification.actions,
    }));

    res.json({
      notifications,
      total,
      page,
      limit,
    });
  },
);

// ─── Get Statistics ───────────────────────────────────────────────────────────
// ─── Get Statistics ───────────────────────────────────────────────────────────
export const getStatistics = asyncHandler(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );

  const roleIds = await getUserRoleIds(req.user.userId);
  const recipRepo = AppDataSource.getRepository(NotificationRecipient);

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
    } else if (c.severity === 'high' || c.severity === 'medium') {
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
});

// ─── Mark Read/Archive/Dismiss Actions ─────────────────────────────────────────
export const markAsRead = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  const { id } = req.params;

  const recipRepo = AppDataSource.getRepository(NotificationRecipient);
  const recipient = await recipRepo.findOne({
    where: { notificationId: id, userId: req.user.userId },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  recipient.status = NotificationRecipientStatus.READ;
  recipient.readAt = new Date();
  await recipRepo.save(recipient);

  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );

  const recipRepo = AppDataSource.getRepository(NotificationRecipient);
  await recipRepo.update(
    { userId: req.user.userId, status: NotificationRecipientStatus.UNREAD },
    { status: NotificationRecipientStatus.READ, readAt: new Date() },
  );

  res.json({ success: true });
});

export const archiveNotification = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  const { id } = req.params;

  const recipRepo = AppDataSource.getRepository(NotificationRecipient);
  const recipient = await recipRepo.findOne({
    where: { notificationId: id, userId: req.user.userId },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  recipient.status = NotificationRecipientStatus.ARCHIVED;
  await recipRepo.save(recipient);

  res.json({ success: true });
});

export const dismissNotification = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  const { id } = req.params;

  const recipRepo = AppDataSource.getRepository(NotificationRecipient);
  const recipient = await recipRepo.findOne({
    where: { notificationId: id, userId: req.user.userId },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );

  recipient.status = NotificationRecipientStatus.DISMISSED;
  await recipRepo.save(recipient);

  res.json({ success: true });
});

// ─── Execute Smart Action (Decoupled Delegation) ──────────────────────────────
// eslint-disable-next-line sonarjs/cognitive-complexity
export const executeAction = asyncHandler<ExecuteActionParamsDto>(async (req, res) => {
  if (!req.user)
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  const { id, actionId } = req.params;

  const actionRepo = AppDataSource.getRepository(NotificationAction);
  const recipRepo = AppDataSource.getRepository(NotificationRecipient);

  const action = await actionRepo.findOne({
    where: { id: actionId, notificationId: id },
    relations: ['notification'],
  });

  if (!action) {
    throw new AppError(
      AppErrorMessage.ACTION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // Re-check action validation permissions
  if (action.requiredPermissionKey) {
    const userPermissions = req.permissions ?? [];
    if (!userPermissions.includes(action.requiredPermissionKey)) {
      throw new AppError(
        AppErrorMessage.ACCESS_DENIED_PRIVILEGE,
        HttpStatusCode.FORBIDDEN,
        AppErrorCode.FORBIDDEN,
      );
    }
  }

  const payload = action.payload ?? {};

  // Decoupled delegation boundary
  if (action.type === NotificationActionType.TENDER_APPROVE) {
    const { tenderId } = payload;
    if (typeof tenderId !== 'string') {
      throw new AppError(
        'Invalid tenderId in action payload',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    await updateTenderStatus(tenderId, { status: TenderVersionStatus.APPROVED }, req.user.userId);
  } else if (action.type === NotificationActionType.TENDER_REJECT) {
    const { tenderId } = payload;
    if (typeof tenderId !== 'string') {
      throw new AppError(
        'Invalid tenderId in action payload',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    await updateTenderStatus(tenderId, { status: TenderVersionStatus.REJECTED }, req.user.userId);
  } else if (action.type === NotificationActionType.ROLE_APPROVE) {
    const { roleId } = payload;
    const versionVal = payload.version;
    const version = typeof versionVal === 'number' ? versionVal : Number(versionVal);
    if (typeof roleId !== 'string' || isNaN(version)) {
      throw new AppError(
        'Invalid roleId or version in action payload',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    const reviewRepo = AppDataSource.getRepository(RoleReview);
    const review = await reviewRepo.findOne({
      where: { roleId, roleVersion: { version } },
    });
    if (!review)
      throw new AppError(
        AppErrorMessage.ROLE_REVIEW_WORKFLOW_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    await RbacService.reviewRoleVersion(
      review.id,
      'APPROVED',
      'Approved via quick action.',
      req.user.userId,
    );
  } else if (action.type === NotificationActionType.ROLE_REJECT) {
    const { roleId } = payload;
    const versionVal = payload.version;
    const version = typeof versionVal === 'number' ? versionVal : Number(versionVal);
    if (typeof roleId !== 'string' || isNaN(version)) {
      throw new AppError(
        'Invalid roleId or version in action payload',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    const reviewRepo = AppDataSource.getRepository(RoleReview);
    const review = await reviewRepo.findOne({
      where: { roleId, roleVersion: { version } },
    });
    if (!review)
      throw new AppError(
        AppErrorMessage.ROLE_REVIEW_WORKFLOW_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    await RbacService.reviewRoleVersion(
      review.id,
      'REJECTED',
      'Rejected via quick action.',
      req.user.userId,
    );
  } else {
    throw new AppError(
      AppErrorMessage.UNSUPPORTED_ACTION_TYPE,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BAD_REQUEST,
    );
  }

  // Resolve recipient status to READ once completed
  const recipient = await recipRepo.findOne({
    where: { notificationId: id, userId: req.user.userId },
  });
  if (recipient) {
    recipient.status = NotificationRecipientStatus.READ;
    recipient.readAt = new Date();
    await recipRepo.save(recipient);
  }

  res.json({ success: true, message: 'Action successfully resolved' });
});

// ─── SSE Notification Stream ──────────────────────────────────────────────────
export const initializeNotificationStream = asyncHandler(async (req, res) => {
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
});

// ─── Categories & Preferences ──────────────────────────────────────────────────
export const getCategories = asyncHandler(async (_req, res) => {
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
});

export const getPreferences = asyncHandler(async (_req, res) => {
  // Stub user notification preferences
  res.json({
    email: { review: true, security: true, system: false },
    inApp: { review: true, security: true, system: true },
  });
});

export const updatePreferences = asyncHandler<{}, {}, UpdatePreferencesBodyDto>(
  async (req, res) => {
    const updated = req.body;
    // Stub update preference status
    res.json({ success: true, updated });
  },
);
