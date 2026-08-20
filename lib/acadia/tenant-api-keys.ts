import { z } from 'zod';

export const TENANT_API_KEY_PUBLIC_SELECT = `
  id,
  name,
  keyPrefix,
  scopes,
  lastUsedAt,
  revokedAt,
  expiresAt,
  createdAt,
  updatedAt,
  User:createdByUserId ( name, email )
`;

export const tenantApiKeyCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80, 'Name is too long.'),
  expiresOn: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
      'Enter a valid expiry date.',
    ),
});

export type TenantApiKeyCreateValues = z.infer<typeof tenantApiKeyCreateSchema>;

export function expiryIsoFromDateInput(expiresOn: string | undefined): string | null {
  if (!expiresOn) {
    return null;
  }
  const iso = `${expiresOn}T23:59:59.000Z`;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    throw new Error('Enter a valid expiry date.');
  }
  if (parsed <= Date.now()) {
    throw new Error('Expiry date must be in the future.');
  }
  return iso;
}

export function tenantApiKeySelectOmitsHash(select: string): boolean {
  return !/\bkeyHash\b/.test(select);
}
