// src/database/seeds/rbac/permissions/taxonomy.seed.ts

export const taxonomyPermissions = [
  {
    key: 'category.view',
    name: 'View Categories',
    action: 'view',
    description: 'View category hierarchy.',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: 'category.create',
    name: 'Create Categories',
    action: 'create',
    description: 'Create new categories.',
    displayOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: 'category.update',
    name: 'Update Categories',
    action: 'update',
    description: 'Update existing categories.',
    displayOrder: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: 'category.delete',
    name: 'Delete Categories',
    action: 'delete',
    description: 'Delete categories.',
    displayOrder: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: 'category.restore',
    name: 'Restore Categories',
    action: 'restore',
    description: 'Restore deleted categories.',
    displayOrder: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },

  {
    key: 'category.export',
    name: 'Export Categories',
    action: 'export',
    description: 'Export category data.',
    displayOrder: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];
