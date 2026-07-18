export type SafeJsonValue =
  string | number | boolean | null | undefined | SafeJsonValue[] | { [key: string]: SafeJsonValue };

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
export function redactSensitiveData(value: SafeJsonValue): SafeJsonValue {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((arrayElement) => redactSensitiveData(arrayElement));
  }

  if (typeof value === 'object') {
    const output: Record<string, SafeJsonValue> = {};
    for (const key of Object.keys(value)) {
      const lowerKey = key.toLowerCase();

      // Match key contains or matches sensitive keys
      const isSensitive = Array.from(SENSITIVE_KEYS).some(
        (sensitiveKey) => lowerKey === sensitiveKey || lowerKey.includes(sensitiveKey),
      );

      if (isSensitive) {
        output[key] = '******';
      } else {
        output[key] = redactSensitiveData(value[key]);
      }
    }
    return output;
  }

  return value;
}
