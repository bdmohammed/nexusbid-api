import { Request, Response } from 'express';
import { asyncHandler } from '../../core/asyncHandler';
import { sendOk, sendCreated } from '../../core/response';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  SubmitCategoryReviewDto,
  CategoryReviewDecisionDto,
  MergeCategoryDto,
} from './categories.dto';

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated as CategoryQueryDto;
  const result = await CategoriesService.listCategories(query);
  return sendOk(res, result);
});

export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const tree = await CategoriesService.getCategoryTree();
  return sendOk(res, tree);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CreateCategoryDto;
  const category = await CategoriesService.createCategory(dto, req.user!.userId);
  return sendCreated(res, category, 'Category draft created successfully.');
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as UpdateCategoryDto;
  const category = await CategoriesService.updateCategory(req.params['id']!, dto, req.user!.userId);
  return sendOk(res, category, 'Category draft updated successfully.');
});

export const submitVersion = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as SubmitCategoryReviewDto;
  const review = await CategoriesService.submitVersion(
    req.params['id']!,
    req.params['versionId']!,
    dto.reviewerIds,
    req.user!.userId
  );
  return sendOk(res, review, 'Submitted version for review successfully.');
});

export const reviewVersion = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as CategoryReviewDecisionDto;
  const review = await CategoriesService.reviewVersion(
    req.params['reviewId']!,
    dto,
    req.user!.userId
  );
  return sendOk(res, review, 'Review decision recorded successfully.');
});

export const mergeCategories = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.validated as MergeCategoryDto;
  await CategoriesService.mergeCategories(dto.sourceId, dto.targetId, req.user!.userId);
  return sendOk(res, null, 'Categories merged successfully.');
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const stats = await CategoriesService.getAnalytics();
  return sendOk(res, stats);
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await CategoriesService.listReviews(req.query);
  return sendOk(res, reviews);
});
