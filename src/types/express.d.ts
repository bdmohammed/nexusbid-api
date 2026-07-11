import type { AccountType } from './enums';

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
