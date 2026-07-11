import { parse } from 'csv-parse/sync';
import { z } from 'zod';

import { AppError } from '../../core/AppError';
import { asyncHandler } from '../../core/asyncHandler';
import { paginationMeta, sendCreated, sendOk } from '../../core/response';

import { BatchCategoryDto, BatchStateDto } from './admin.dto';
import * as service from './admin.service';

import type {
  AnalyticsQueryDto,
  BlockUserDto,
  CategoryQueryDto,
  CreateAdminDto,
  CreateCategoryDto,
  CreatePlanDto,
  CreateStateDto,
  CreateUserNoteDto,
  ImpersonateUserDto,
  ListUsersQueryDto,
  StateQueryDto,
  UpdateCategoryDto,
  UpdatePlanDto,
  UpdateStateDto,
  UpdateUserDetailDto,
} from './admin.dto';
import type { Request, Response } from 'express';

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const q = req.validated as ListUsersQueryDto;
  const { users, total } = await service.listUsers(q);
  return sendOk(res, users, 'OK', paginationMeta(total, q.page, q.limit));
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getUserById(req.params['id']!);
  return sendOk(res, user);
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const { isBlocked } = req.validated as BlockUserDto;
  res.locals['auditBefore'] = { isBlocked: !isBlocked };
  const user = await service.blockUser(req.params['id']!, isBlocked);
  return sendOk(res, user, isBlocked ? 'User blocked' : 'User unblocked');
});

export const getUserStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await service.getUserStats();
  return sendOk(res, stats);
});

export const getUserOverview = asyncHandler(async (req: Request, res: Response) => {
  const overview = await service.getUserOverview(req.params['id']!);
  return sendOk(res, overview);
});

export const getUserSecurity = asyncHandler(async (req: Request, res: Response) => {
  const security = await service.getUserSecurity(req.params['id']!);
  return sendOk(res, security);
});

export const getUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await service.getUserSessions(req.params['id']!);
  return sendOk(res, sessions);
});

export const getUserDevices = asyncHandler(async (req: Request, res: Response) => {
  const devices = await service.getUserDevices(req.params['id']!);
  return sendOk(res, devices);
});

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10));
  const limit = Math.max(1, parseInt((req.query['limit'] as string) ?? '20', 10));
  const { activities, total } = await service.getUserActivity(req.params['id']!, page, limit);
  return sendOk(res, activities, 'OK', paginationMeta(total, page, limit));
});

export const getUserTimeline = asyncHandler(async (req: Request, res: Response) => {
  const timeline = await service.getUserTimeline(req.params['id']!);
  return sendOk(res, timeline);
});

export const getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10));
  const limit = Math.max(1, parseInt((req.query['limit'] as string) ?? '20', 10));
  const { logs, total } = await service.getUserAuditLogs(req.params['id']!, page, limit);
  return sendOk(res, logs, 'OK', paginationMeta(total, page, limit));
});

export const getUserSubscription = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await service.getUserSubscription(req.params['id']!);
  return sendOk(res, subscription);
});

export const getUserNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await service.getUserNotes(req.params['id']!);
  return sendOk(res, notes);
});

export const createUserNote = asyncHandler(async (req: Request, res: Response) => {
  const { note } = req.validated as CreateUserNoteDto;
  const userNote = await service.createUserNote(req.params['id']!, req.user!.userId, note);
  return sendCreated(res, userNote, 'Internal note added');
});

export const updateUserDetail = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateUserDetailDto;

  const before = await service.getUserOverview(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.updateUserDetail(req.params['id']!, dto);
  return sendOk(res, user, 'User details updated successfully');
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserOverview(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.suspendUser(req.params['id']!);
  return sendOk(res, user, 'User account suspended');
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserOverview(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.unsuspendUser(req.params['id']!);
  return sendOk(res, user, 'User account activated');
});

export const archiveUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserOverview(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.archiveUser(req.params['id']!);
  return sendOk(res, user, 'User account archived');
});

export const unarchiveUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserOverview(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.unarchiveUser(req.params['id']!);
  return sendOk(res, user, 'User account unarchived');
});

export const forcePasswordChange = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getUserSecurity(req.params['id']!);
  res.locals.auditBefore = before;

  const user = await service.forcePasswordChange(req.params['id']!);
  return sendOk(res, user, 'Forced password change configured for next login');
});

export const sendResetPasswordEmail = asyncHandler(async (req: Request, res: Response) => {
  await service.sendResetPasswordEmailAction(req.params['id']!);
  return sendOk(res, null, 'Password reset email sent to user');
});

export const sendUserVerification = asyncHandler(async (req: Request, res: Response) => {
  await service.sendUserVerificationAction(req.params['id']!);
  return sendOk(res, null, 'Verification email sent to user');
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const { id, sessionId } = req.params;
  await service.revokeSession(id!, sessionId!);
  return sendOk(res, null, 'User session revoked successfully');
});

export const revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
  await service.revokeAllSessions(req.params['id']!);
  return sendOk(res, null, 'All user sessions revoked successfully');
});

export const impersonateUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.validated as ImpersonateUserDto;
  const result = await service.impersonateUser(req.params['id']!, req.user!.userId, reason);
  return sendOk(res, result, 'Impersonation session established');
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateAdminDto;
  const admin = await service.createAdmin(dto);
  return sendCreated(res, admin, 'Admin account created');
});

export const getUserRoles = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getUserRoles(req.params['id']!);
  return sendOk(res, data);
});

export const assignUserRoles = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = z
    .object({
      assignments: z
        .array(
          z.object({
            roleId: z.string().uuid(),
            expiresAt: z.string().nullable().optional(),
          }),
        )
        .min(1, 'At least one role assignment is required'),
    })
    .parse(req.body);

  const beforeState = await service.getUserRoles(id);
  res.locals.auditBefore = beforeState.assigned;

  await service.assignUserRoles(id, body.assignments, req.user!.userId);
  return sendOk(res, null, 'User roles updated successfully');
});

export const revokeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { id, roleId } = req.params;

  const beforeState = await service.getUserRoles(id);
  res.locals.auditBefore = beforeState.assigned;

  await service.revokeUserRole(id, roleId, req.user!.userId);
  return sendOk(res, null, 'User role revoked successfully');
});

export const previewUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.previewUserPermissions(req.params['id']!);
  return sendOk(res, data);
});

// ─── Plans ────────────────────────────────────────────────────────────────────

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await service.listAllPlans();
  return sendOk(res, plans);
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreatePlanDto;
  const plan = await service.createPlan(dto, req.user!.userId);
  return sendCreated(res, plan, 'Plan created');
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdatePlanDto;
  const plan = await service.updatePlan(req.params['id']!, dto);
  return sendOk(res, plan, 'Plan updated');
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query['page'] as string) ?? 1;
  const limit = parseInt(req.query['limit'] as string) ?? 20;
  const { subscriptions, total } = await service.listAllSubscriptions({ page, limit });
  return sendOk(res, subscriptions, 'OK', paginationMeta(total, page, limit));
});

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getRevenue = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as AnalyticsQueryDto;
  const data = await service.getRevenueAnalytics(dto);
  return sendOk(res, data);
});

export const getTopDownloads = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getTopDownloads();
  return sendOk(res, data);
});

export const getUserGrowth = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as AnalyticsQueryDto;
  const data = await service.getUserGrowth(dto);
  return sendOk(res, data);
});

// ─── Categories ──────────────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated as CategoryQueryDto;
  const { categories, total } = await service.listAllCategories(query);
  const stats = await service.getCategoryStats();
  return sendOk(
    res,
    { categories, total, stats },
    'OK',
    paginationMeta(total, query.page, query.limit),
  );
});

export const getCategoryHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await service.getCategoryHistory(req.params['id']!);
  return sendOk(res, history);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateCategoryDto;
  const category = await service.createCategory(dto, req.user!.userId);
  return sendCreated(res, category, 'Category created');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateCategoryDto;
  const before = await service.getCategoryById(req.params['id']!);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    description: before.description,
    isActive: before.isActive,
  };
  const category = await service.updateCategory(req.params['id']!, dto, req.user!.userId);
  return sendOk(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getCategoryById(req.params['id']!);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    description: before.description,
    isActive: before.isActive,
  };
  await service.deleteCategory(req.params['id']!, req.user!.userId);
  return sendOk(res, null, 'Category deleted');
});

export const batchCategories = asyncHandler(async (req: Request, res: Response) => {
  let items: any[] = [];
  const contentType = req.headers['content-type'] ?? '';

  if (contentType.includes('text/csv') ?? contentType.includes('text/plain')) {
    if (typeof req.body !== 'string' ?? !req.body.trim()) {
      throw new AppError('Empty or invalid CSV body', 400, 'INVALID_BATCH_BODY');
    }

    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      items = records.map((record: any) => {
        const rawAction = record.action ?? 'upsert';
        const action = rawAction.toLowerCase();

        return {
          action: ['upsert', 'delete'].includes(action) ? action : 'upsert',
          code: record.code ? String(record.code).trim() : '',
          name: record.name ? String(record.name).trim() : undefined,
          slug: record.slug ? String(record.slug).trim() : undefined,
          description: record.description ? String(record.description).trim() : undefined,
          isActive:
            record.is_active !== undefined
              ? (record.is_active === 'true' ?? record.is_active === '1')
              : undefined,
        };
      });
    } catch (err: any) {
      throw new AppError(`Failed to parse CSV file: ${err.message}`, 400, 'CSV_PARSE_FAILED');
    }
  } else if (contentType.includes('application/json')) {
    if (!Array.isArray(req.body)) {
      throw new AppError('JSON body must be an array of batch items', 400, 'INVALID_BATCH_BODY');
    }
    items = req.body.map((item: any) => ({
      action: item.action ?? 'upsert',
      code: item.code ? String(item.code).trim() : '',
      name: item.name ? String(item.name).trim() : undefined,
      slug: item.slug ? String(item.slug).trim() : undefined,
      description: item.description ? String(item.description).trim() : undefined,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : undefined,
    }));
  } else {
    throw new AppError(
      'Unsupported Content-Type. Use application/json or text/csv',
      415,
      'UNSUPPORTED_MEDIA_TYPE',
    );
  }

  const MAX_BATCH_SIZE = 500;
  if (items.length > MAX_BATCH_SIZE) {
    throw new AppError(
      `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} items`,
      400,
      'BATCH_SIZE_EXCEEDED',
    );
  }

  if (items.length === 0) {
    throw new AppError('No items found in the batch payload', 400, 'EMPTY_BATCH');
  }

  const validationResult = BatchCategoryDto.safeParse(items);
  if (!validationResult.success) {
    throw new AppError('Validation failed for batch items', 422, 'VALIDATION_ERROR');
  }

  const result = await service.processBatchCategories(validationResult.data, req.user!.userId);
  return sendOk(res, result, 'Batch processed successfully');
});

// ─── States ───────────────────────────────────────────────────────────────────

export const listStates = asyncHandler(async (req: Request, res: Response) => {
  const q = req.validated as StateQueryDto;
  const { states, total } = await service.listAllStates(q);
  return sendOk(res, states, 'OK', paginationMeta(total, q.page, q.limit));
});

export const listCountries = asyncHandler(async (_req: Request, res: Response) => {
  const countries = await service.listDistinctCountries();
  return sendOk(res, countries);
});

export const createState = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateStateDto;
  const state = await service.createState(dto, req.user!.userId);
  return sendCreated(res, state, 'State created');
});

export const updateState = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateStateDto;
  const before = await service.getStateById(req.params['id']!);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    type: before.type,
    country: before.country,
  };
  const state = await service.updateState(req.params['id']!, dto, req.user!.userId);
  return sendOk(res, state, 'State updated');
});

export const deleteState = asyncHandler(async (req: Request, res: Response) => {
  const before = await service.getStateById(req.params['id']!);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    type: before.type,
    country: before.country,
  };
  await service.deleteState(req.params['id']!, req.user!.userId);
  return sendOk(res, null, 'State deleted');
});

export const batchStates = asyncHandler(async (req: Request, res: Response) => {
  let items: any[] = [];
  const contentType = req.headers['content-type'] ?? '';

  if (contentType.includes('text/csv') ?? contentType.includes('text/plain')) {
    if (typeof req.body !== 'string' ?? !req.body.trim()) {
      throw new AppError('Empty or invalid CSV body', 400, 'INVALID_BATCH_BODY');
    }

    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      items = records.map((record: any) => {
        const rawAction = record.action ?? 'upsert';
        const action = rawAction.toLowerCase();

        return {
          action: ['upsert', 'delete'].includes(action) ? action : 'upsert',
          code: record.code ? String(record.code).trim() : '',
          name: record.name ? String(record.name).trim() : undefined,
          slug: record.slug ? String(record.slug).trim() : undefined,
          type: record.type ? String(record.type).trim() : undefined,
          country: record.country ? String(record.country).trim() : undefined,
        };
      });
    } catch (err: any) {
      throw new AppError(`Failed to parse CSV file: ${err.message}`, 400, 'CSV_PARSE_FAILED');
    }
  } else if (contentType.includes('application/json')) {
    if (!Array.isArray(req.body)) {
      throw new AppError('JSON body must be an array of batch items', 400, 'INVALID_BATCH_BODY');
    }
    items = req.body.map((item: any) => ({
      action: item.action ?? 'upsert',
      code: item.code ? String(item.code).trim() : '',
      name: item.name ? String(item.name).trim() : undefined,
      slug: item.slug ? String(item.slug).trim() : undefined,
      type: item.type ? String(item.type).trim() : undefined,
      country: item.country ? String(item.country).trim() : undefined,
    }));
  } else {
    throw new AppError(
      'Unsupported Content-Type. Use application/json or text/csv',
      415,
      'UNSUPPORTED_MEDIA_TYPE',
    );
  }

  const MAX_BATCH_SIZE = 500;
  if (items.length > MAX_BATCH_SIZE) {
    throw new AppError(
      `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE} items`,
      400,
      'BATCH_SIZE_EXCEEDED',
    );
  }

  if (items.length === 0) {
    throw new AppError('No items found in the batch payload', 400, 'EMPTY_BATCH');
  }

  const validationResult = BatchStateDto.safeParse(items);
  if (!validationResult.success) {
    throw new AppError('Validation failed for batch items', 422, 'VALIDATION_ERROR');
  }

  const result = await service.processBatchStates(validationResult.data, req.user!.userId);
  return sendOk(res, result, 'Batch processed successfully');
});

export const approveAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roleId } = req.body;
  if (!roleId) {
    throw new AppError('Role ID is required for approval', 400, 'VALIDATION_ERROR');
  }
  await service.approveAdminUser(id, req.user!.userId, roleId);
  return sendOk(res, null, 'Administrator request approved successfully');
});

export const rejectAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) {
    throw new AppError('Rejection reason is required', 400, 'VALIDATION_ERROR');
  }
  await service.rejectAdminUser(id, req.user!.userId, reason);
  return sendOk(res, null, 'Administrator request rejected successfully');
});
