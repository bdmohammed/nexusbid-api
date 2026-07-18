import type { AccountType } from './enums';

import 'express-serve-static-core';

export interface JwtPayload {
  sub: string;
  userId: string; // Backward compatibility alias for sub
  email: string;
  accountType: AccountType;
  role: AccountType; // Backward compatibility alias for accountType
  adminRole: unknown | null; // Backward compatibility placeholder
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      /** Attached by authenticate middleware after JWT verification */
      user?: JwtPayload;
      /** Unique ID tracking request lifecycle */
      requestId?: string;
      /** Permissions resolved for the authenticated admin user */
      permissions?: string[];
      /** Roles assigned to the authenticated admin user */
      roles?: string[];
      /** Attached by validate middleware after Zod parsing */
      validated?: unknown;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    traceId?: string;
    requestId?: string;
    'x-trace-id'?: string;
    'x-request-id'?: string;
    traceparent?: string;
  }
}
