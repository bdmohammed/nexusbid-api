import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../../core/AppError';
import { asyncHandler } from '../../../core/asyncHandler';
import {
  AuditLogIdParamSchema,
  AuditQuerySchema,
  CorrelationIdParamSchema,
  RequestAuditExportSchema,
  RequestIdParamSchema,
  SecurityEventsQuerySchema,
  UpdateRetentionSchema,
} from '../dto/audit.dto';
import * as service from '../services/audit.service';

import type { JwtPayload } from '../../../types/express';
import type {
  AuditLogIdParamDto,
  AuditQueryDto,
  CorrelationIdParamDto,
  RequestAuditExportDto,
  RequestIdParamDto,
  SecurityEventsQueryDto,
  UpdateRetentionDto,
} from '../dto/audit.dto';

export const searchLogs = asyncHandler<{}, object, {}, AuditQueryDto>(async (req, res) => {
  const filters = AuditQuerySchema.parse(req.query);
  const data = await service.searchLogs(filters);
  res.json({ success: true, data });
});

export const getStatistics = asyncHandler(async (_req, res) => {
  const data = await service.getStatistics();
  res.json({ success: true, data });
});

export const getLogDetails = asyncHandler<AuditLogIdParamDto>(async (req, res) => {
  const { id } = AuditLogIdParamSchema.parse(req.params);
  const data = await service.getLogDetails(id);
  res.json({ success: true, data });
});

export const getCorrelationTimeline = asyncHandler<CorrelationIdParamDto>(async (req, res) => {
  const { correlationId } = CorrelationIdParamSchema.parse(req.params);
  const data = await service.getCorrelationTimeline(correlationId);
  res.json({ success: true, data });
});

export const getRequestTimeline = asyncHandler<RequestIdParamDto>(async (req, res) => {
  const { requestId } = RequestIdParamSchema.parse(req.params);
  const data = await service.getRequestTimeline(requestId);
  res.json({ success: true, data });
});

export const getSecurityEvents = asyncHandler<{}, object, {}, SecurityEventsQueryDto>(
  async (req, res) => {
    const { page, limit } = SecurityEventsQuerySchema.parse(req.query);
    const data = await service.getSecurityEvents(page, limit);
    res.json({ success: true, data });
  },
);

export const getRetentionPolicies = asyncHandler(async (_req, res) => {
  const data = await service.getRetentionPolicies();
  res.json({ success: true, data });
});

export const updateRetentionPolicy = asyncHandler<{}, object, UpdateRetentionDto>(
  async (req, res) => {
    const dto = UpdateRetentionSchema.parse(req.body);
    const data = await service.updateRetentionPolicy(dto);
    res.json({ success: true, data });
  },
);

export const requestAuditExport = asyncHandler<{}, object, RequestAuditExportDto>(
  async (req, res) => {
    const { userId } = req.user as JwtPayload;
    if (!userId) {
      throw new AppError(
        AppErrorMessage.USER_NOT_LOGGED_IN,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHORIZED,
      );
    }

    const dto = RequestAuditExportSchema.parse(req.body);
    const data = await service.queueExportJob(userId, dto);
    res.json({ success: true, data, message: 'Audit export job queued successfully.' });
  },
);
