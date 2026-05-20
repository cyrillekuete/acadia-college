import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { generateAcadiaId } from '@/lib/acadia/ids';

type Client = SupabaseClient<Database>;

export async function fetchSubjectLevelIds(
  supabase: Client,
  tenantId: string,
  subjectId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('SubjectLevel')
    .select('levelId')
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId)
    .order('createdAt', { ascending: true });

  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.levelId as string);
}

export async function fetchSubjectIdsForLevel(
  supabase: Client,
  tenantId: string,
  levelId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('SubjectLevel')
    .select('subjectId')
    .eq('tenantId', tenantId)
    .eq('levelId', levelId);

  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.subjectId as string);
}

export async function replaceSubjectLevels(
  supabase: Client,
  tenantId: string,
  subjectId: string,
  levelIds: string[],
  now: string,
): Promise<void> {
  const unique = Array.from(new Set(levelIds.filter((id) => id.trim().length > 0)));

  const { error: deleteError } = await supabase
    .from('SubjectLevel')
    .delete()
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (deleteError) {
    throw deleteError;
  }

  if (unique.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('SubjectLevel').insert(
    unique.map((levelId) => ({
      id: generateAcadiaId('sublvl'),
      tenantId,
      subjectId,
      levelId,
      createdAt: now,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}
