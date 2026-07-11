import { v4 as uuidv4 } from 'uuid';

import { runWithContext } from '../config/requestContext';

import type { NextFunction, Request, Response } from 'express';

const HEX_REGEX = /^[0-9a-fA-F]+$/;

/**
 * Reads W3C loosely, doesn't fully implement it yet.
 * Validates the basic W3C traceparent structure (version-traceId-parentId-traceFlags)
 * and returns the traceId segment if fully valid.
 */
function extractTraceIdFromTraceparent(traceparent: string): string | undefined {
  if (!traceparent) return undefined;
  const parts = traceparent.split('-');
  if (parts.length === 4) {
    const [version, traceId, parentId, flags] = parts;
    if (
      version.length === 2 &&
      HEX_REGEX.test(version) &&
      traceId.length === 32 &&
      HEX_REGEX.test(traceId) &&
      parentId.length === 16 &&
      HEX_REGEX.test(parentId) &&
      flags.length === 2 &&
      HEX_REGEX.test(flags)
    ) {
      return traceId;
    }
  }
  return undefined;
}

/**
 * Middleware setting up the Request Trace ID (Correlation ID) using AsyncLocalStorage.
 */
export const traceContext = (req: Request, res: Response, next: NextFunction): void => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  let traceId = ((req.headers['x-trace-id'] as string) ?? '').trim();

  // If X-Trace-Id is absent, try retrieving from W3C traceparent
  if (!traceId) {
    const traceparent = ((req.headers['traceparent'] as string) ?? '').trim();
    const w3cTraceId = extractTraceIdFromTraceparent(traceparent);
    if (w3cTraceId) {
      traceId = w3cTraceId;
    }
  }

  // Fallback to generating a new UUID v4
  if (!traceId) {
    traceId = uuidv4();
  }

  const requestId = traceId;

  // Stash on request object for fallback references (e.g. error handlers outside the async flow)
  req.traceId = traceId;
  req.requestId = requestId;

  // Set the response header
  res.setHeader('X-Trace-Id', traceId);

  // Wrap rest of the request lifecycle in the AsyncLocalStorage context
  runWithContext({ traceId, requestId }, () => {
    next();
  });
};
