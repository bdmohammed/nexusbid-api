import * as crypto from 'crypto';

/**
 * Decodes a base32 string into a Buffer.
 */
function decodeBase32(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]!);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a secure random base32 secret.
 */
export function generateSecret(length: number = 16): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

/**
 * Verifies a TOTP token against a base32 secret with step drift window.
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const epoch = Math.floor(Date.now() / 1000);
  const step = 30;
  const currentCounter = Math.floor(epoch / step);

  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(0, 0);
    buffer.writeUInt32BE(counter, 4);

    try {
      const key = decodeBase32(secret);
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hash = hmac.digest();

      const offset = hash[hash.length - 1]! & 0xf;
      const code =
        ((hash[offset]! & 0x7f) << 24) |
        ((hash[offset + 1]! & 0xff) << 16) |
        ((hash[offset + 2]! & 0xff) << 8) |
        (hash[offset + 3]! & 0xff);

      const calculatedToken = (code % 1000000).toString().padStart(6, '0');
      if (calculatedToken === token) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Generates standard 2FA recovery codes.
 */
export function generateRecoveryCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}
