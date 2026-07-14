import { SESv2Client, type SESv2ClientConfig } from "@aws-sdk/client-sesv2";
import { env } from "./env";

const sesConfig: SESv2ClientConfig = {
  region: env.AWS_REGION,
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  sesConfig.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

export const sesClient = new SESv2Client(sesConfig);
