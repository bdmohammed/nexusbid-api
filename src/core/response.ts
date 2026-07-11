import { getTraceId } from '../config/requestContext';

import type { Response } from 'express';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T | undefined;
  meta?: Record<string, unknown> | undefined;
  traceId?: string | undefined;
}

/**
 * Sends a 200 OK response.
 */
export function sendOk<T>(
  res: Response,
  data: T,
  message = 'Success',
  meta?: Record<string, unknown>,
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    traceId: getTraceId(),
  };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

/**
 * Sends a 201 Created response.
 */
export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): Response {
  return res.status(201).json({
    success: true,
    message,
    data,
    traceId: getTraceId(),
  });
}

/**
 * Sends a 204 No Content response.
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Pagination meta builder — attach to sendOk's meta argument.
 */
export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): Record<string, unknown> {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}
