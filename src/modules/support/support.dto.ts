import { z } from 'zod';

export const ContactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(120, 'Name must be at most 120 characters long')
    .trim(),
  email: z.email({ error: 'Invalid email address' }),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters long')
    .max(2000, 'Message must be at most 2000 characters long')
    .trim(),
});
export type ContactFormDto = z.infer<typeof ContactFormSchema>;
