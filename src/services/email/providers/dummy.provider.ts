import { logger } from '../../../config/logger';
import type { EmailProvider } from '../email.provider';
import type { EmailOptions } from '../types/email.types';

export class DummyEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<void> {
    const toAddresses = typeof options.to === 'string' ? [options.to] : options.to;
    const recipientDomain = toAddresses[0]?.includes('@') ? toAddresses[0].split('@')[1] : 'unknown';

    // Log using structured logger
    logger.info(
      {
        provider: 'dummy',
        to: toAddresses,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        recipientDomain,
      },
      '📧 [DUMMY] Email logged'
    );

    // Extract links from HTML (e.g. verification or reset password links) to print to console
    const linkMatch = options.html.match(/href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : null;

    if (link) {
      logger.info(
        `\n--------------------------------------------------\n📧 [DUMMY] Preview link: ${link}\n--------------------------------------------------\n`
      );
    }
  }
}
