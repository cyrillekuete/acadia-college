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
