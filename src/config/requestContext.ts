import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  traceId: string;
  requestId: string;
  userId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs a function within the request context.
 */
export function runWithContext<T>(context: RequestContext, callback: () => T): T {
  return asyncLocalStorage.run(context, callback);
}

/**
 * Returns the current request context or undefined if not set.
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Convenience function to retrieve the current request trace ID.
 */
export function getTraceId(): string | undefined {
  return getContext()?.traceId;
}

/**
 * Mutates the current context to attach the authenticated user ID.
 */
export function setUserId(userId: string): void {
  const context = getContext();
  if (context) {
    context.userId = userId;
  }
}
