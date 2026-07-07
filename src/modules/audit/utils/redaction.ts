const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'otp',
  'cvv',
  'accessToken',
  'refreshToken',
  'authorization',
  'cardnumber',
  'passwordconfirmation',
  'oldpassword',
  'newpassword',
]);

/**
 * Recursively scans an object and redacts keys that represent sensitive credentials.
 */
export function redactSensitiveData(val: any): any {
  if (val === null || val === undefined) {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => redactSensitiveData(item));
  }

  if (typeof val === 'object') {
    const output: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      const lowerKey = k.toLowerCase();
      
      // Match key contains or matches sensitive keys
      const isSensitive = Array.from(SENSITIVE_KEYS).some(
        (sk) => lowerKey === sk || lowerKey.includes(sk)
      );

      if (isSensitive) {
        output[k] = '******';
      } else {
        output[k] = redactSensitiveData(val[k]);
      }
    }
    return output;
  }

  return val;
}
