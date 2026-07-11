import { logger } from '../../config/logger';

import * as plansService from './plans.service';

import type { Request, Response } from 'express';

export async function listAllPlans(req: Request, res: Response): Promise<void> {
  try {
    const plans = await plansService.listAllPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    logger.error({ error }, 'Error listing plans');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getPlanById(req: Request, res: Response): Promise<void> {
  try {
    const plan = await plansService.getPlanById(req.params['id']);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    logger.error({ error }, 'Error getting plan');
    res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
  }
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = (req as any).user;
    const plan = await plansService.createPlan(req.body, userId);
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    logger.error({ error }, 'Error creating plan');
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPlanVersionDraft(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = (req as any).user;
    const version = await plansService.createPlanVersionDraft(req.params['id'], userId);
    res.status(201).json({ success: true, data: version });
  } catch (error: any) {
    logger.error({ error }, 'Error creating version draft');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

export async function submitPlanForReview(req: Request, res: Response): Promise<void> {
  try {
    const version = await plansService.submitPlanForReview(req.params['versionId']);
    res.json({ success: true, data: version });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting for review');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

export async function assignPlanReviewer(req: Request, res: Response): Promise<void> {
  try {
    const review = await plansService.assignPlanReviewer(
      req.params['reviewId'],
      req.body.reviewerId,
    );
    res.json({ success: true, data: review });
  } catch (error: any) {
    logger.error({ error }, 'Error assigning reviewer');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

export async function submitPlanReviewAction(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = (req as any).user;
    const review = await plansService.submitPlanReviewAction(
      req.params['reviewId'],
      userId,
      req.body.commentText,
      req.body.action,
    );
    res.json({ success: true, data: review });
  } catch (error: any) {
    logger.error({ error }, 'Error submitting review action');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

export async function publishPlanVersion(req: Request, res: Response): Promise<void> {
  try {
    const plan = await plansService.publishPlanVersion(req.params['versionId']);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    logger.error({ error }, 'Error publishing plan version');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

// ─── Coupons ────────────────────────────────────────────────────────────────

export async function listCoupons(req: Request, res: Response): Promise<void> {
  try {
    const coupons = await plansService.listCoupons();
    res.json({ success: true, data: coupons });
  } catch (error) {
    logger.error({ error }, 'Error listing coupons');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createCoupon(req: Request, res: Response): Promise<void> {
  try {
    const coupon = await plansService.createCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (error: any) {
    logger.error({ error }, 'Error creating coupon');
    res.status(400).json({ success: false, message: error.message });
  }
}

export async function toggleCouponStatus(req: Request, res: Response): Promise<void> {
  try {
    const coupon = await plansService.toggleCouponStatus(req.params['id']);
    res.json({ success: true, data: coupon });
  } catch (error: any) {
    logger.error({ error }, 'Error toggling coupon status');
    res.status(error.statusCode ?? 400).json({ success: false, message: error.message });
  }
}

// ─── Migrations ─────────────────────────────────────────────────────────────

export async function initiateSubscriptionMigration(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = (req as any).user;
    const migration = await plansService.initiateSubscriptionMigration(
      req.body.sourcePlanVersionId,
      req.body.targetPlanVersionId,
      userId,
    );
    res.json({ success: true, data: migration });
  } catch (error: any) {
    logger.error({ error }, 'Error starting migration');
    res.status(400).json({ success: false, message: error.message });
  }
}

// ─── Dashboard Stats & Features Catalog ─────────────────────────────────────

export async function getSubscriptionsDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await plansService.getSubscriptionsDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Error fetching dashboard stats');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFeatureCatalog(req: Request, res: Response): Promise<void> {
  try {
    const catalog = await plansService.getFeatureCatalog();
    res.json({ success: true, data: catalog });
  } catch (error) {
    logger.error({ error }, 'Error listing features');
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createFeatureCatalogItem(req: Request, res: Response): Promise<void> {
  try {
    const item = await plansService.createFeatureCatalogItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    logger.error({ error }, 'Error creating feature catalog item');
    res.status(400).json({ success: false, message: error.message });
  }
}
