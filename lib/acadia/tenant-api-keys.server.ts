import { createHash, randomBytes } from 'node:crypto';

export function hashTenantApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function generateTenantApiKeyMaterial(): {
  plaintext: string;
  keyPrefix: string;
  keyHash: string;
} {
  const plaintext = `acd_${randomBytes(32).toString('base64url')}`;
  return {
    plaintext,
    keyPrefix: plaintext.slice(0, 8),
    keyHash: hashTenantApiKey(plaintext),
  };
}
