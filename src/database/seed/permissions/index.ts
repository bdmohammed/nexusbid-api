// src/database/seeds/rbac/permissions/index.ts

import { analyticsPermissions } from './analytics.seed';
import { auditPermissions } from './audit.seed';
import { billingPermissions } from './billing.seed';
import { cmsPermissions } from './cms.seed';
import { dashboardPermissions } from './dashboard.seed';
import { notificationsPermissions } from './notifications.seed';
import { permissionsPermissions } from './permissions.seed';
import { rolesPermissions } from './roles.seed';
import { supportPermissions } from './support.seed';
import { systemPermissions } from './system.seed';
import { taxonomyPermissions } from './taxonomy.seed';
import { tendersPermissions } from './tenders.seed';
import { usersPermissions } from './users.seed';

export const permissionsSeed = [
  ...dashboardPermissions,
  ...usersPermissions,
  ...rolesPermissions,
  ...permissionsPermissions,
  ...tendersPermissions,
  ...taxonomyPermissions,
  ...billingPermissions,
  ...supportPermissions,
  ...analyticsPermissions,
  ...cmsPermissions,
  ...notificationsPermissions,
  ...auditPermissions,
  ...systemPermissions,
];
