import { z } from 'zod';

export const CreateSubscriptionDto = z.object({
  planId: z.string().uuid(),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url(),
  targetStateId: z.string().uuid().optional(),
  targetCountry: z.string().optional(),
  targetCategoryId: z.string().uuid().optional(),
  selectedCategoryIds: z.array(z.string().uuid()).optional(),
  couponCode: z.string().optional(),
});
export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionDto>;
