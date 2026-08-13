import type { SupabaseClient } from '@supabase/supabase-js';
import { localizedText, translate } from '@/lib/acadia/locale';

export type UserRecentUploadRow = {
  id: string;
  titleEn: string;
  titleFr: string | null;
  storageKey: string | null;
  externalUrl: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
};

export type UserRecentUploadItem = {
  id: string;
  title: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
  href: string | null;
};

function fileNameFromStorageKey(storageKey: string | null | undefined): string | null {
  if (!storageKey) {
    return null;
  }
  const parts = storageKey.split('/');
  const last = parts[parts.length - 1]?.trim();
  return last || null;
}

export function mapUserRecentUploadRow(
  row: UserRecentUploadRow,
  resolvePublicUrl: (storageKey: string) => string | null,
): UserRecentUploadItem {
  const fileName = fileNameFromStorageKey(row.storageKey);
  const href = row.storageKey
    ? resolvePublicUrl(row.storageKey)
    : row.externalUrl?.trim() || null;

  return {
    id: row.id,
    title:
      localizedText(row.titleEn, row.titleFr) ||
      fileName ||
      translate('common.messages.untitled', { defaultValue: 'Untitled file' }),
    fileName,
    fileSizeBytes: row.fileSizeBytes,
    mimeType: row.mimeType,
    createdAt: row.createdAt,
    href,
  };
}

export async function fetchUserRecentUploads(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  limit = 4,
): Promise<UserRecentUploadRow[]> {
  const { data, error } = await supabase
    .from('LearningMaterial')
    .select(
      'id, titleEn, titleFr, storageKey, externalUrl, fileSizeBytes, mimeType, createdAt',
    )
    .eq('tenantId', tenantId)
    .eq('uploadedByUserId', userId)
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRecentUploadRow[];
}
