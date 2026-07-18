import { z } from 'zod';

export const PayPalWebhookSchema = z.object({
  id: z.string().min(1, 'Webhook ID is required'),
  event_type: z.string().min(1, 'Event type is required'),
  resource: z
    .object({
      id: z.string().optional(),
      billing_agreement_id: z.string().optional(),
    })
    .passthrough(),
});

export type PayPalWebhookDto = z.infer<typeof PayPalWebhookSchema>;
