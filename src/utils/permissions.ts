import type { PermissionActions } from '@/authorization/registry/types';
import type { PermissionModuleKey } from '@/types/types';

export function definePermission<
  Module extends PermissionModuleKey,
  Action extends PermissionActions,
>(
  module: Module,
  action: Action,
  config: {
    name: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  },
) {
  return {
    name: config.name,
    description: config.description,
    displayOrder: config.displayOrder,
    isActive: config.isActive,
    action,
    key: `${module}.${action}` as const,
  };
}
