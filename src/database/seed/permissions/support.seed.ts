// src/database/seeds/rbac/permissions/support.seed.ts

export const supportPermissions = [
    // ==========================================================
    // Support Tickets
    // ==========================================================

    {
        key: 'ticket.view',
        name: 'View Tickets',
        action: 'view',
        description: 'View customer support tickets.',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.create',
        name: 'Create Tickets',
        action: 'create',
        description: 'Create support tickets on behalf of customers.',
        displayOrder: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.update',
        name: 'Update Tickets',
        action: 'update',
        description: 'Update support ticket information.',
        displayOrder: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.delete',
        name: 'Delete Tickets',
        action: 'delete',
        description: 'Delete support tickets.',
        displayOrder: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.assign',
        name: 'Assign Tickets',
        action: 'assign',
        description: 'Assign tickets to support agents.',
        displayOrder: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.reply',
        name: 'Reply to Tickets',
        action: 'reply',
        description: 'Reply to customer support tickets.',
        displayOrder: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.close',
        name: 'Close Tickets',
        action: 'close',
        description: 'Close resolved support tickets.',
        displayOrder: 7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.reopen',
        name: 'Reopen Tickets',
        action: 'reopen',
        description: 'Reopen previously closed tickets.',
        displayOrder: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.export',
        name: 'Export Tickets',
        action: 'export',
        description: 'Export support ticket reports.',
        displayOrder: 9,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },

    {
        key: 'ticket.audit',
        name: 'View Ticket Audit',
        action: 'audit',
        description: 'View support ticket activity history.',
        displayOrder: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
    },
];