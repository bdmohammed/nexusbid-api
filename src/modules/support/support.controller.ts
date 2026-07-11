import { asyncHandler } from '../../core/asyncHandler';
import { sendOk } from '../../core/response';
import { sendContactFormEmail } from '../../services/email.service';

import type { ContactFormDto } from './support.dto';
import type { Request, Response } from 'express';

/**
 * POST /api/v1/support/contact
 * Public endpoint — forwards contact form submissions to admin email via Resend.
 * Rate limited to 3 per IP per hour to prevent spam.
 * Never exposes the admin email to the public frontend.
 */
export const submitContactForm = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message } = req.validated as ContactFormDto;
  await sendContactFormEmail({ senderName: name, senderEmail: email, message });
  return sendOk(res, null, 'Your message has been sent. We will respond within 24–48 hours.');
});
