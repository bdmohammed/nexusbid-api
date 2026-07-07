// src/database/seeds/rbac/permissions/dashboard.seed.ts

export const dashboardPermissions = [
    {
        key: 'dashboard.view',
        name: 'View Dashboard',
        action: 'view',
        description:
            'Access the administration dashboard and view system overview.',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'dashboard.export',
        name: 'Export Dashboard',
        action: 'export',
        description:
            'Export dashboard charts, reports and summary statistics.',
        displayOrder: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },
];