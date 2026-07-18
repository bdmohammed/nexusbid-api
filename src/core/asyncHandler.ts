import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

/**
 * Wraps an async route handler to forward any rejected promise to next(err).
 * Also catches synchronous throws (e.g. a non-async handler that throws directly).
 * Eliminates try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler => {
  const wrapped: RequestHandler = (req, res, next) => {
    try {
      Promise.resolve(
        fn(req as never, res as never, next), // single cast point, contained here
      ).catch(next);
    } catch (err) {
      next(err);
    }
  };
  return wrapped;
};
