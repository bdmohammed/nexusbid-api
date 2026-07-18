import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const billingPermissionModule: PermissionModuleSeed = {
  name: 'Billing & Subscriptions',
  key: PermissionModules.BILLING,
  displayOrder: 7,
  description: 'Billing & Subscriptions Module',
  isSystemModule: true,
  isActive: true,
} as const;

export const BillingPermissions = {
  SUBSCRIPTION_VIEW: definePermission(PermissionModules.BILLING, PermissionActions.VIEW, {
    name: 'View Subscriptions',
    description: 'View subscriptions, plans and customer subscription details.',
    displayOrder: 1,
    isActive: true,
  }),

  SUBSCRIPTION_CREATE: definePermission(PermissionModules.BILLING, PermissionActions.CREATE, {
    name: 'Create Subscription',
    description: 'Create subscriptions manually.',
    displayOrder: 2,
    isActive: true,
  }),

  SUBSCRIPTION_UPDATE: definePermission(PermissionModules.BILLING, PermissionActions.UPDATE, {
    name: 'Update Subscription',
    description: 'Update subscription information.',
    displayOrder: 3,
    isActive: true,
  }),

  // SUBSCRIPTION_CANCEL: definePermission(PermissionModules.BILLING, 'cancel', {
  //   name: 'Cancel Subscription',
  //   description: 'Cancel customer subscriptions.',
  //   displayOrder: 4,
  //   isActive: true,
  // }),

  // SUBSCRIPTION_RESUME: definePermission(PermissionModules.BILLING, 'resume', {
  //   name: 'Resume Subscription',
  //   description: 'Resume cancelled subscriptions.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // SUBSCRIPTION_CHANGE_PLAN: definePermission(PermissionModules.BILLING, 'change_plan', {
  //   name: 'Change Subscription Plan',
  //   description: 'Upgrade or downgrade customer subscription plans.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  PLAN_VIEW: definePermission(PermissionModules.BILLING, PermissionActions.VIEW, {
    name: 'View Plans',
    description: 'View subscription plans.',
    displayOrder: 20,
    isActive: true,
  }),

  PLAN_CREATE: definePermission(PermissionModules.BILLING, PermissionActions.CREATE, {
    name: 'Create Plans',
    description: 'Create subscription plans.',
    displayOrder: 21,
    isActive: true,
  }),

  PLAN_UPDATE: definePermission(PermissionModules.BILLING, PermissionActions.UPDATE, {
    name: 'Update Plans',
    description: 'Modify subscription plans.',
    displayOrder: 22,
    isActive: true,
  }),

  PLAN_DELETE: definePermission(PermissionModules.BILLING, PermissionActions.DELETE, {
    name: 'Delete Plans',
    description: 'Delete subscription plans.',
    displayOrder: 23,
    isActive: true,
  }),

  PAYMENT_VIEW: definePermission(PermissionModules.BILLING, PermissionActions.VIEW, {
    name: 'View Payments',
    description: 'View payment transactions.',
    displayOrder: 40,
    isActive: true,
  }),

  // PAYMENT_REFUND: definePermission(PermissionModules.BILLING, 'refund', {
  //   name: 'Refund Payments',
  //   description: 'Refund completed payments.',
  //   displayOrder: 41,
  //   isActive: true,
  // }),

  PAYMENT_EXPORT: definePermission(PermissionModules.BILLING, PermissionActions.EXPORT, {
    name: 'Export Payments',
    description: 'Export payment reports.',
    displayOrder: 42,
    isActive: true,
  }),

  COUPON_VIEW: definePermission(PermissionModules.BILLING, PermissionActions.VIEW, {
    name: 'View Coupons',
    description: 'View discount coupons.',
    displayOrder: 60,
    isActive: true,
  }),

  COUPON_CREATE: definePermission(PermissionModules.BILLING, PermissionActions.CREATE, {
    name: 'Create Coupons',
    description: 'Create discount coupons.',
    displayOrder: 61,
    isActive: true,
  }),

  COUPON_UPDATE: definePermission(PermissionModules.BILLING, PermissionActions.UPDATE, {
    name: 'Update Coupons',
    description: 'Update coupon information.',
    displayOrder: 62,
    isActive: true,
  }),

  COUPON_DELETE: definePermission(PermissionModules.BILLING, PermissionActions.DELETE, {
    name: 'Delete Coupons',
    description: 'Delete coupons.',
    displayOrder: 63,
    isActive: true,
  }),

  INVOICE_VIEW: definePermission(PermissionModules.BILLING, PermissionActions.VIEW, {
    name: 'View Invoices',
    description: 'View invoices.',
    displayOrder: 80,
    isActive: true,
  }),

  INVOICE_EXPORT: definePermission(PermissionModules.BILLING, PermissionActions.EXPORT, {
    name: 'Export Invoices',
    description: 'Export invoices.',
    displayOrder: 81,
    isActive: true,
  }),
} as const;
