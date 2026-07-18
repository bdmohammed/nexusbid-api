import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const tenderPermissionModule: PermissionModuleSeed = {
  name: 'Tender Management',
  key: PermissionModules.TENDER,
  displayOrder: 5,
  description: 'Tender Management Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const TenderPermissions = {
  VIEW: definePermission(PermissionModules.TENDER, PermissionActions.VIEW, {
    name: 'View Tenders',
    description: 'View tenders and tender details.',
    displayOrder: 1,
    isActive: true,
  }),

  CREATE: definePermission(PermissionModules.TENDER, PermissionActions.CREATE, {
    name: 'Create Tender',
    description: 'Create new tenders.',
    displayOrder: 2,
    isActive: true,
  }),

  UPDATE: definePermission(PermissionModules.TENDER, PermissionActions.UPDATE, {
    name: 'Update Tender',
    description: 'Edit existing tenders.',
    displayOrder: 3,
    isActive: true,
  }),

  DELETE: definePermission(PermissionModules.TENDER, PermissionActions.DELETE, {
    name: 'Delete Tender',
    description: 'Soft delete tenders.',
    displayOrder: 4,
    isActive: true,
  }),

  RESTORE: definePermission(PermissionModules.TENDER, PermissionActions.RESTORE, {
    name: 'Restore Tender',
    description: 'Restore previously deleted tenders.',
    displayOrder: 5,
    isActive: true,
  }),

  PUBLISH: definePermission(PermissionModules.TENDER, PermissionActions.PUBLISH, {
    name: 'Publish Tender',
    description: 'Publish draft tenders.',
    displayOrder: 6,
    isActive: true,
  }),

  UNPUBLISH: definePermission(PermissionModules.TENDER, PermissionActions.UNPUBLISH, {
    name: 'Unpublish Tender',
    description: 'Move published tenders back to draft.',
    displayOrder: 7,
    isActive: true,
  }),

  APPROVE: definePermission(PermissionModules.TENDER, PermissionActions.APPROVE, {
    name: 'Approve Tender',
    description: 'Approve tenders awaiting review.',
    displayOrder: 8,
    isActive: true,
  }),

  REJECT: definePermission(PermissionModules.TENDER, PermissionActions.REJECT, {
    name: 'Reject Tender',
    description: 'Reject tenders awaiting approval.',
    displayOrder: 9,
    isActive: true,
  }),

  ARCHIVE: definePermission(PermissionModules.TENDER, PermissionActions.ARCHIVE, {
    name: 'Archive Tender',
    description: 'Archive completed or expired tenders.',
    displayOrder: 10,
    isActive: true,
  }),

  // UPLOAD_DOCUMENT: definePermission(PermissionModules.TENDER, 'upload', {
  //   name: 'Upload Documents',
  //   description: 'Upload tender related documents.',
  //   displayOrder: 11,
  //   isActive: true,
  //   customKey: 'tender.upload_document',
  // }),

  // DELETE_DOCUMENT: definePermission(PermissionModules.TENDER, 'delete_document', {
  //   name: 'Delete Documents',
  //   description: 'Delete tender related documents.',
  //   displayOrder: 12,
  //   isActive: true,
  //   customKey: 'tender.delete_document',
  // }),

  EXPORT: definePermission(PermissionModules.TENDER, PermissionActions.EXPORT, {
    name: 'Export Tenders',
    description: 'Export tender data.',
    displayOrder: 13,
    isActive: true,
  }),

  // AUDIT: definePermission(PermissionModules.TENDER, 'audit', {
  //   name: 'View Tender Audit',
  //   description: 'View tender audit history.',
  //   displayOrder: 14,
  //   isActive: true,
  // }),
} as const;
