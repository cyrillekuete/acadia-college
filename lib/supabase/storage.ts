import { getSupabaseEnvOrNull } from '@/lib/supabase/env';

export const TENANT_ASSETS_BUCKET = 'tenant-assets';
export const LEARNING_MATERIALS_BUCKET = 'learning-materials';

/** Public URL for a file in the tenant-assets bucket (`logoStorageKey` is the object path). */
export function getTenantAssetPublicUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey?.trim()) {
    return null;
  }
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }
  const path = storageKey.replace(/^\/+/, '');
  return `${env.url}/storage/v1/object/public/${TENANT_ASSETS_BUCKET}/${path}`;
}

/** Resolve a stored user avatar (public URL, site path, or tenant-assets key) for `<img src>`. */
export function resolveUserAvatarUrl(
  avatar: string | null | undefined,
): string | null {
  if (!avatar?.trim()) {
    return null;
  }
  if (/^https?:\/\//i.test(avatar) || avatar.startsWith('/')) {
    return avatar;
  }
  return getTenantAssetPublicUrl(avatar);
}

export type TenantLogoKeys = {
  reportCardLogoStorageKey?: string | null;
  logoStorageKey?: string | null;
};

/** Prefer the dedicated report-card crest; fall back to the institution logo. */
export function resolveReportCardLogoStorageKey(
  tenant: TenantLogoKeys | null | undefined,
): string | null {
  const reportCard = tenant?.reportCardLogoStorageKey?.trim();
  if (reportCard) {
    return reportCard;
  }
  const institution = tenant?.logoStorageKey?.trim();
  return institution || null;
}

/** Public URL for the logo shown on report cards and class reports. */
export function resolveReportCardLogoUrl(
  tenant: TenantLogoKeys | null | undefined,
): string | null {
  return getTenantAssetPublicUrl(resolveReportCardLogoStorageKey(tenant));
}

/** Public URL for a learning material file in Supabase Storage. */
export function getLearningMaterialPublicUrl(
  storageKey: string | null | undefined,
): string | null {
  if (!storageKey?.trim()) {
    return null;
  }
  const env = getSupabaseEnvOrNull();
  if (!env) {
    return null;
  }
  const path = storageKey.replace(/^\/+/, '');
  return `${env.url}/storage/v1/object/public/${LEARNING_MATERIALS_BUCKET}/${path}`;
}
