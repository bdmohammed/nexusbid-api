import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../core/AppError';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Parses and validates the specified request target (body, query, params).
 * On success, attaches the parsed (and type-coerced) data to req.validated.
 * On failure, returns 422 Unprocessable Entity with all validation errors.
 *
 * Usage:
 *   router.post('/register', validate(RegisterDto, 'body'), handler)
 */
export const validate = (schema: ZodSchema, target: Target = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        Object.assign(
          new AppError('Validation failed', 422, 'VALIDATION_ERROR'),
          { errors },
        ),
      );
    }

    req.validated = result.data;
    next();
  };
