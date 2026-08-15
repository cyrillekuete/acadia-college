'use server';

import { revalidateTag } from 'next/cache';
import { filterAllowedAcadiaCacheTags } from '@/lib/acadia/cache/tags';
import { requireSessionApi } from '@/lib/acadia/require-session-api';

export async function revalidateAcadiaTags(
  tags: readonly string[],
): Promise<{ ok: boolean; revalidated: string[] }> {
  const session = await requireSessionApi();
  if (!session.ok) {
    return { ok: false, revalidated: [] };
  }

  const allowed = filterAllowedAcadiaCacheTags(tags, session.ctx.tenantId);
  for (const tag of allowed) {
    revalidateTag(tag, 'max');
  }
  return { ok: true, revalidated: allowed };
}
