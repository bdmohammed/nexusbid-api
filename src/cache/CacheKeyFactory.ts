// src/cache/CacheKeyFactory.ts

export const PERMISSION_CACHE = {
  PREFIX: 'permissions',
  VERSION: '1',
} as const;

/**
 * Factory for standardizing cache key generation across the entire enterprise application.
 * Ensures consistent prefix names, versioning, and structure to prevent key collisions.
 */
export class CacheKeyFactory {
  private static readonly VERSION = '1';

  /**
   * Generates cache key for user effective permissions.
   */
  static permission(userId: string): string {
    return `${PERMISSION_CACHE.PREFIX}:v${PERMISSION_CACHE.VERSION}:${userId}`;
  }

  /**
   * Generates cache key for a role definition.
   */
  static role(roleId: string): string {
    return `role:v${this.VERSION}:${roleId}`;
  }

  /**
   * Generates cache key for a user profile/metadata.
   */
  static user(userId: string): string {
    return `user:v${this.VERSION}:${userId}`;
  }

  /**
   * Generates cache key for a user session or token validation.
   */
  static session(sessionId: string): string {
    return `session:v${this.VERSION}:${sessionId}`;
  }

  /**
   * Generates cache key for feature flags (either global or user-specific).
   */
  static featureFlag(flagKey: string, userId?: string): string {
    if (userId) {
      return `feature_flag:v${this.VERSION}:${userId}:${flagKey}`;
    }
    return `feature_flag:v${this.VERSION}:${flagKey}`;
  }

  /**
   * Generates cache key for system or user settings.
   */
  static setting(settingKey: string, userId?: string): string {
    if (userId) {
      return `setting:v${this.VERSION}:${userId}:${settingKey}`;
    }
    return `setting:v${this.VERSION}:${settingKey}`;
  }
}
