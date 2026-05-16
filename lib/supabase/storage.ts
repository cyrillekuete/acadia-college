import { getSupabaseEnvOrNull } from '@/lib/supabase/env';

export const TENANT_ASSETS_BUCKET = 'tenant-assets';

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
