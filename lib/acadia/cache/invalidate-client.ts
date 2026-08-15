import { revalidateAcadiaTags } from '@/lib/acadia/cache/revalidate';

export function invalidateAcadiaCache(tags: readonly string[]): void {
  if (tags.length === 0) {
    return;
  }
  void revalidateAcadiaTags(tags);
}
