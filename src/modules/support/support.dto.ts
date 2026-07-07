import { z } from 'zod';

export const ContactFormDto = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email(),
  message: z.string().min(10).max(2000).trim(),
});
export type ContactFormDto = z.infer<typeof ContactFormDto>;
