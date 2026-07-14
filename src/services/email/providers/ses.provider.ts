import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { sesClient } from '../../../config/ses';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { performance } from 'perf_hooks';
import type { EmailProvider } from '../email.provider';
import type { EmailOptions } from '../types/email.types';

export class SesProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<void> {
    const toAddresses = typeof options.to === 'string' ? [options.to] : options.to;
    const recipientDomain = toAddresses[0]?.includes('@') ? toAddresses[0].split('@')[1] : 'unknown';
    logger.info({ recipientDomain }, 'Sending email via SES');

    const start = performance.now();
    try {
      const command = new SendEmailCommand({
        FromEmailAddress: env.FROM_EMAIL,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: options.cc,
          BccAddresses: options.bcc,
        },
        ReplyToAddresses: options.replyTo,
        Content: {
          Simple: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: options.html,
                Charset: 'UTF-8',
              },
              Text: {
                Data: options.text,
                Charset: 'UTF-8',
              },
            },
          },
        },
      });

      const response = await sesClient.send(command);
      const durationMs = performance.now() - start;
      logger.info(
        { id: response.MessageId, recipientDomain, durationMs },
        'Email sent via SES successfully'
      );
    } catch (err) {
      const durationMs = performance.now() - start;
      logger.error(
        { err, recipientDomain, durationMs },
        'Email sending via SES failed'
      );
      throw err;
    }
  }
}
