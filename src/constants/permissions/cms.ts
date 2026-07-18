import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const cmsPermissionModule: PermissionModuleSeed = {
  name: 'Content Management',
  key: PermissionModules.CMS,
  displayOrder: 10,
  description: 'Content Management Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const CmsPermissions = {
  VIEW: definePermission(PermissionModules.CMS, PermissionActions.VIEW, {
    name: 'View CMS',
    description: 'View CMS pages, blogs and content.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.CMS, PermissionActions.CREATE, {
    name: 'Create Content',
    description: 'Create CMS pages and blog posts.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.CMS, PermissionActions.UPDATE, {
    name: 'Update Content',
    description: 'Edit existing CMS content.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.CMS, PermissionActions.DELETE, {
    name: 'Delete Content',
    description: 'Delete CMS content.',
    displayOrder: 4,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.CMS, PermissionActions.RESTORE, {
    name: 'Restore Content',
    description: 'Restore archived or deleted CMS content.',
    displayOrder: 5,
    isActive: true,
  }),

  PUBLISH: definePermission(PermissionModules.CMS, PermissionActions.PUBLISH, {
    name: 'Publish Content',
    description: 'Publish draft content to the live website.',
    displayOrder: 6,
    isActive: true,
  }),

  // UNPUBLISH: definePermission(PermissionModules.CMS, 'unpublish', {
  //   name: 'Unpublish Content',
  //   description: 'Move published content back to draft.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  ARCHIVE: definePermission(PermissionModules.CMS, PermissionActions.ARCHIVE, {
    name: 'Archive Content',
    description: 'Archive CMS pages and blog posts.',
    displayOrder: 8,
    isActive: true,
  }),

  MEDIA_MANAGE: definePermission(PermissionModules.CMS, PermissionActions.MANAGE, {
    name: 'Manage Media',
    description: 'Upload, replace and remove media assets.',
    displayOrder: 9,
    isActive: true,
  }),

  SEO_MANAGE: definePermission(PermissionModules.CMS, PermissionActions.MANAGE, {
    name: 'Manage SEO',
    description: 'Manage SEO metadata for CMS pages.',
    displayOrder: 10,
    isActive: true,
  }),

  EXPORT: definePermission(PermissionModules.CMS, PermissionActions.EXPORT, {
    name: 'Export Content',
    description: 'Export CMS pages and blog posts.',
    displayOrder: 11,
    isActive: true,
  }),

  // AUDIT: definePermission(PermissionModules.CMS, 'audit', {
  //   name: 'View CMS Audit',
  //   description: 'View CMS content audit history.',
  //   displayOrder: 12,
  //   isActive: true,
  // }),
} as const;
