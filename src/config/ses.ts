import { SESv2Client } from '@aws-sdk/client-sesv2';
import { env } from './env';

export const sesClient = new SESv2Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});
