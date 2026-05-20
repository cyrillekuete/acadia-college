import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { generateAcadiaId } from '@/lib/acadia/ids';

type Client = SupabaseClient<Database>;

export async function fetchClassSubjectIds(
  supabase: Client,
  tenantId: string,
  classId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('ClassSubject')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('classId', classId);

  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.subjectId as string);
}

export async function insertClassSubjects(
  supabase: Client,
  tenantId: string,
  classId: string,
  subjectIds: string[],
): Promise<void> {
  if (subjectIds.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from('ClassSubject').insert(
    subjectIds.map((subjectId) => ({
      id: generateAcadiaId('csj'),
      tenantId,
      classId,
      subjectId,
      createdAt: now,
    })),
  );
  if (error) {
    throw error;
  }
}

export async function syncClassSubjects(
  supabase: Client,
  tenantId: string,
  classId: string,
  subjectIds: string[],
): Promise<void> {
  const existing = await fetchClassSubjectIds(supabase, tenantId, classId);
  const nextSet = new Set(subjectIds);
  const toRemove = existing.filter((id) => !nextSet.has(id));
  const existingSet = new Set(existing);
  const toAdd = subjectIds.filter((id) => !existingSet.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ClassSubject')
      .delete()
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .in('subjectId', toRemove);
    if (error) {
      throw error;
    }
  }

  await insertClassSubjects(supabase, tenantId, classId, toAdd);
}
