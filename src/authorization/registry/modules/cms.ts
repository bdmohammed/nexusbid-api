import type { ModuleDefinition } from '../types';

export const cmsModule: ModuleDefinition = {
  slug: 'cms',
  name: 'Content Management',
  icon: 'FileText',
  displayOrder: 10,
  introducedIn: '1.0.0',
  permissions: [
    {
      key: 'cms.view',
      name: 'View CMS',
      displayOrder: 1,
      action: 'view',
      description: 'View CMS pages, blogs and content.',
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.create',
      name: 'Create Content',
      displayOrder: 2,
      action: 'create',
      description: 'Create CMS pages and blog posts.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.update',
      name: 'Update Content',
      displayOrder: 3,
      action: 'update',
      description: 'Edit existing CMS content.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.delete',
      name: 'Delete Content',
      displayOrder: 4,
      action: 'delete',
      description: 'Delete CMS content.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.publish',
      name: 'Publish Content',
      displayOrder: 5,
      action: 'publish',
      description: 'Publish drafts to the live website.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.unpublish',
      name: 'Unpublish Content',
      displayOrder: 6,
      action: 'custom',
      description: 'Move published content back to draft.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.archive',
      name: 'Archive Content',
      displayOrder: 7,
      action: 'archive',
      description: 'Archive CMS pages and posts.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.restore',
      name: 'Restore Content',
      displayOrder: 8,
      action: 'restore',
      description: 'Restore archived or deleted content.',
      dependencies: {
        allOf: ['cms.view', 'cms.delete'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.media.manage',
      name: 'Manage Media',
      displayOrder: 9,
      action: 'manage',
      description: 'Upload, replace and remove media assets.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.seo.manage',
      name: 'Manage SEO',
      displayOrder: 10,
      action: 'manage',
      description: 'Manage SEO metadata for CMS pages.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.export',
      name: 'Export Content',
      displayOrder: 11,
      action: 'export',
      description: 'Export CMS pages and content.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
    {
      key: 'cms.audit',
      name: 'View CMS Audit',
      displayOrder: 12,
      action: 'view',
      description: 'View CMS audit history.',
      dependencies: {
        allOf: ['cms.view'],
      },
      introducedIn: '1.0.0',
    },
  ],
};
