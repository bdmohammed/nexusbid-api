// src/database/seeds/rbac/roles.seed.ts

export const roles = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'System administrator with unrestricted access to all administrative features.',
    isSystemRole: true,
    isActive: true,
    version: 1,

    createdBy: null,
    updatedBy: null,

    createdAt: new Date(),
    updatedAt: new Date(),

    deletedAt: null,
  },
];
