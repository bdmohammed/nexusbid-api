import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler to forward any rejected promise to next(err).
 * Eliminates try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
