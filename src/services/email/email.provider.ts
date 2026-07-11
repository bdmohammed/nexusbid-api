import { EmailOptions } from './types/email.types';

export interface EmailProvider {
  send(options: EmailOptions): Promise<void>;
}
