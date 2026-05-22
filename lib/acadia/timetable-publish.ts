import { canWriteRegistry } from '@/lib/acadia/roles';

export function isTimetablePublished(
  publishedAt: string | null | undefined,
): boolean {
  return typeof publishedAt === 'string' && publishedAt.length > 0;
}

/** Administrators always bypass; everyone else needs a published timetable. */
export function canViewTimetableSlots(
  roleSlug: string | null | undefined,
  publishedAt: string | null | undefined,
): boolean {
  if (canWriteRegistry(roleSlug)) {
    return true;
  }
  return isTimetablePublished(publishedAt);
}

export function timetablePublishStatusLabel(
  publishedAt: string | null | undefined,
): 'draft' | 'published' {
  return isTimetablePublished(publishedAt) ? 'published' : 'draft';
}
