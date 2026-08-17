import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { levelLabel, unwrapRelation } from '@/lib/acadia/record-display';
import {
  attachTopicProgress,
  cascadeProgressTopicIds,
  isSchemeOfWorkStatus,
  type AdminSchemeYearRow,
  type SchemeListItem,
  type SchemeOfWorkRecord,
  type SchemeOfWorkStatus,
  type SchemeOfWorkTopicProgressRecord,
  type SchemeOfWorkTopicRecord,
  type SchemeTermOption,
  type SchemeTopicWithProgress,
} from '@/lib/acadia/scheme-of-work';
import type { SchemeOfWorkTopicFormValues } from '@/lib/acadia/scheme-of-work-schemas';
import { localizedText } from '@/lib/acadia/locale';
import { normalizeRichText } from '@/lib/acadia/sanitize-html';
import type { Database } from '@/lib/supabase/database.types';
import { embed, FK } from '@/lib/supabase/embed-selects';
import { fetchClassSubjectDisplayRows } from '@/lib/supabase/queries/class-subjects';
import { fetchTeacherTeachingScope } from '@/lib/supabase/queries/teacher-students';

type Client = SupabaseClient<Database>;

type SchemeRow = {
  id: string;
  tenantId: string;
  academicYearId: string;
  subjectId: string;
  levelId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type EmbeddedLevelRow = {
  levelId: string;
  Level?: unknown;
};

type ClassWithLevelRow = {
  id: string;
  name: string;
  levelId: string;
  Level?: unknown;
};

export type SchemeOfWorkDetail = SchemeOfWorkRecord & {
  subjectCode: string;
  subjectName: string;
  levelName: string;
  academicYearLabel: string;
};

function emptyToNull(value: string | null | undefined): string | null {
  const normalized = normalizeRichText(value);
  return normalized.length > 0 ? normalized : null;
}

function asSchemeStatus(value: string | null | undefined): SchemeOfWorkStatus {
  return isSchemeOfWorkStatus(value) ? value : 'DRAFT';
}

function mapSchemeRow(row: {
  id: string;
  tenantId: string;
  academicYearId: string;
  subjectId: string;
  levelId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}): SchemeOfWorkRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    academicYearId: row.academicYearId,
    subjectId: row.subjectId,
    levelId: row.levelId,
    status: asSchemeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function fetchTermsForAcademicYear(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
): Promise<SchemeTermOption[]> {
  const { data, error } = await supabase
    .from('Term')
    .select('id, number')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .order('number', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    number: row.number as number,
  }));
}

export async function fetchSchemeBySubjectLevelYear(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  subjectId: string,
  levelId: string,
): Promise<SchemeOfWorkRecord | null> {
  const { data, error } = await supabase
    .from('SchemeOfWork')
    .select(
      'id, tenantId, academicYearId, subjectId, levelId, status, createdAt, updatedAt',
    )
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('subjectId', subjectId)
    .eq('levelId', levelId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return mapSchemeRow(data);
}

export async function fetchSchemeDetailById(
  supabase: Client,
  tenantId: string,
  schemeId: string,
): Promise<SchemeOfWorkDetail | null> {
  const { data, error } = await supabase
    .from('SchemeOfWork')
    .select(
      [
        'id, tenantId, academicYearId, subjectId, levelId, status, createdAt, updatedAt',
        embed('Subject', FK.SchemeOfWork_subject, 'code, nameEn, nameFr'),
        embed('Level', FK.SchemeOfWork_level, 'number, name, labelEn, labelFr'),
        embed('AcademicYear', FK.SchemeOfWork_academicYear, 'label'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('id', schemeId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const subject = unwrapRelation<{ code?: string; nameEn?: string; nameFr?: string }>(
    (data as { Subject?: unknown }).Subject,
  );
  const level = unwrapRelation<{
    number?: number;
    name?: string;
    labelEn?: string | null;
    labelFr?: string | null;
  }>((data as { Level?: unknown }).Level);
  const year = unwrapRelation<{ label?: string }>(
    (data as { AcademicYear?: unknown }).AcademicYear,
  );

  return {
    ...mapSchemeRow(data as unknown as SchemeRow),
    subjectCode: subject?.code?.trim() || '',
    subjectName:
      localizedText(subject?.nameEn, subject?.nameFr) || subject?.nameEn || '',
    levelName: levelLabel(level),
    academicYearLabel: year?.label?.trim() || '',
  };
}

export async function fetchSchemeTopics(
  supabase: Client,
  tenantId: string,
  schemeOfWorkId: string,
): Promise<SchemeOfWorkTopicRecord[]> {
  const { data, error } = await supabase
    .from('SchemeOfWorkTopic')
    .select(
      'id, tenantId, schemeOfWorkId, parentTopicId, titleEn, titleFr, descriptionEn, descriptionFr, sortOrder, createdAt, updatedAt',
    )
    .eq('tenantId', tenantId)
    .eq('schemeOfWorkId', schemeOfWorkId)
    .order('sortOrder', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SchemeOfWorkTopicRecord[];
}

export async function fetchSchemeProgressForClass(
  supabase: Client,
  tenantId: string,
  topicIds: string[],
  classId: string,
): Promise<SchemeOfWorkTopicProgressRecord[]> {
  if (topicIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('SchemeOfWorkTopicProgress')
    .select('id, tenantId, topicId, classId, completedAt, completedByStaffProfileId')
    .eq('tenantId', tenantId)
    .eq('classId', classId)
    .in('topicId', topicIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as SchemeOfWorkTopicProgressRecord[];
}

export async function fetchSchemeTopicsWithProgress(
  supabase: Client,
  tenantId: string,
  schemeOfWorkId: string,
  classId?: string | null,
): Promise<SchemeTopicWithProgress[]> {
  const topics = await fetchSchemeTopics(supabase, tenantId, schemeOfWorkId);
  if (!classId || topics.length === 0) {
    return attachTopicProgress(topics, new Map());
  }

  const progress = await fetchSchemeProgressForClass(
    supabase,
    tenantId,
    topics.map((topic) => topic.id),
    classId,
  );
  const progressByTopicId = new Map(progress.map((row) => [row.topicId, row]));
  return attachTopicProgress(topics, progressByTopicId);
}

async function resolveParentTopicId(
  supabase: Client,
  tenantId: string,
  scheme: SchemeOfWorkRecord,
  parentTopicId: string | null | undefined,
): Promise<string | null> {
  const parentId = parentTopicId?.trim() || null;
  if (!parentId) {
    return null;
  }

  const { data, error } = await supabase
    .from('SchemeOfWorkTopic')
    .select('id, schemeOfWorkId, parentTopicId')
    .eq('tenantId', tenantId)
    .eq('id', parentId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data || data.schemeOfWorkId !== scheme.id) {
    throw new Error('Parent topic was not found on this scheme of work.');
  }
  if (data.parentTopicId) {
    throw new Error('Sub-topics cannot have their own sub-topics.');
  }
  return parentId;
}

export async function upsertSchemeOfWork(
  supabase: Client,
  tenantId: string,
  input: { academicYearId: string; subjectId: string; levelId: string },
): Promise<SchemeOfWorkRecord> {
  const existing = await fetchSchemeBySubjectLevelYear(
    supabase,
    tenantId,
    input.academicYearId,
    input.subjectId,
    input.levelId,
  );
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const row = {
    id: generateAcadiaId('sow'),
    tenantId,
    academicYearId: input.academicYearId,
    subjectId: input.subjectId,
    levelId: input.levelId,
    status: 'DRAFT' as const,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from('SchemeOfWork')
    .insert(row)
    .select(
      'id, tenantId, academicYearId, subjectId, levelId, status, createdAt, updatedAt',
    )
    .single();

  if (error) {
    throw error;
  }
  return mapSchemeRow(data);
}

export async function updateSchemeStatus(
  supabase: Client,
  tenantId: string,
  schemeId: string,
  status: SchemeOfWorkStatus,
): Promise<void> {
  const { error } = await supabase
    .from('SchemeOfWork')
    .update({ status, updatedAt: new Date().toISOString() })
    .eq('tenantId', tenantId)
    .eq('id', schemeId);

  if (error) {
    throw error;
  }
}

export async function insertSchemeTopic(
  supabase: Client,
  tenantId: string,
  scheme: SchemeOfWorkRecord,
  values: SchemeOfWorkTopicFormValues,
  sortOrder: number,
): Promise<void> {
  const parentTopicId = await resolveParentTopicId(
    supabase,
    tenantId,
    scheme,
    values.parentTopicId,
  );

  const now = new Date().toISOString();
  const { error } = await supabase.from('SchemeOfWorkTopic').insert({
    id: generateAcadiaId('sowt'),
    tenantId,
    schemeOfWorkId: scheme.id,
    parentTopicId,
    titleEn: values.titleEn.trim(),
    titleFr: values.titleFr?.trim() || values.titleEn.trim(),
    descriptionEn: emptyToNull(values.descriptionEn),
    descriptionFr: emptyToNull(values.descriptionFr),
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    throw error;
  }
}

export async function updateSchemeTopic(
  supabase: Client,
  tenantId: string,
  scheme: SchemeOfWorkRecord,
  topicId: string,
  values: SchemeOfWorkTopicFormValues,
): Promise<void> {
  const { error } = await supabase
    .from('SchemeOfWorkTopic')
    .update({
      titleEn: values.titleEn.trim(),
      titleFr: values.titleFr?.trim() || values.titleEn.trim(),
      descriptionEn: emptyToNull(values.descriptionEn),
      descriptionFr: emptyToNull(values.descriptionFr),
      updatedAt: new Date().toISOString(),
    })
    .eq('tenantId', tenantId)
    .eq('id', topicId)
    .eq('schemeOfWorkId', scheme.id);

  if (error) {
    throw error;
  }
}

export async function deleteSchemeTopic(
  supabase: Client,
  tenantId: string,
  topicId: string,
): Promise<void> {
  const { error } = await supabase
    .from('SchemeOfWorkTopic')
    .delete()
    .eq('tenantId', tenantId)
    .eq('id', topicId);

  if (error) {
    throw error;
  }
}

export async function reorderSchemeTopics(
  supabase: Client,
  tenantId: string,
  orderedTopicIds: string[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const [index, topicId] of orderedTopicIds.entries()) {
    const { error } = await supabase
      .from('SchemeOfWorkTopic')
      .update({ sortOrder: index, updatedAt: now })
      .eq('tenantId', tenantId)
      .eq('id', topicId);
    if (error) {
      throw error;
    }
  }
}

async function setSingleTopicProgress(
  supabase: Client,
  tenantId: string,
  input: {
    topicId: string;
    classId: string;
    completed: boolean;
    staffProfileId: string | null;
  },
): Promise<void> {
  if (!input.completed) {
    const { error } = await supabase
      .from('SchemeOfWorkTopicProgress')
      .delete()
      .eq('tenantId', tenantId)
      .eq('topicId', input.topicId)
      .eq('classId', input.classId);
    if (error) {
      throw error;
    }
    return;
  }

  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await supabase
    .from('SchemeOfWorkTopicProgress')
    .select('id')
    .eq('tenantId', tenantId)
    .eq('topicId', input.topicId)
    .eq('classId', input.classId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { error } = await supabase
      .from('SchemeOfWorkTopicProgress')
      .update({
        completedAt: now,
        completedByStaffProfileId: input.staffProfileId,
      })
      .eq('tenantId', tenantId)
      .eq('id', existing.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('SchemeOfWorkTopicProgress').insert({
    id: generateAcadiaId('sowp'),
    tenantId,
    topicId: input.topicId,
    classId: input.classId,
    completedAt: now,
    completedByStaffProfileId: input.staffProfileId,
    createdAt: now,
  });

  if (error) {
    throw error;
  }
}

export async function markSchemeTopicProgress(
  supabase: Client,
  tenantId: string,
  input: {
    topicId: string;
    classId: string;
    completed: boolean;
    staffProfileId: string | null;
  },
): Promise<void> {
  const { data: topic, error: topicError } = await supabase
    .from('SchemeOfWorkTopic')
    .select('id, schemeOfWorkId')
    .eq('tenantId', tenantId)
    .eq('id', input.topicId)
    .maybeSingle();

  if (topicError) {
    throw topicError;
  }
  if (!topic) {
    throw new Error('Topic was not found.');
  }

  const topics = await fetchSchemeTopicsWithProgress(
    supabase,
    tenantId,
    topic.schemeOfWorkId,
    input.classId,
  );
  const topicIds = cascadeProgressTopicIds(topics, input.topicId, input.completed);
  const ids = topicIds.length > 0 ? topicIds : [input.topicId];

  for (const topicId of ids) {
    await setSingleTopicProgress(supabase, tenantId, {
      topicId,
      classId: input.classId,
      completed: input.completed,
      staffProfileId: input.staffProfileId,
    });
  }
}

export async function fetchSubjectLevelsForSchemePicker(
  supabase: Client,
  tenantId: string,
  subjectId: string,
): Promise<Array<{ levelId: string; levelName: string }>> {
  const { data, error } = await supabase
    .from('SubjectLevel')
    .select(
      [
        'levelId',
        embed('Level', 'SubjectLevel_levelId_tenantId_fkey', 'number, name, labelEn, labelFr'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('subjectId', subjectId);

  if (error) {
    throw error;
  }

  const levels = ((data ?? []) as unknown as EmbeddedLevelRow[]).map((row) => {
    const level = unwrapRelation<{
      number?: number;
      name?: string;
      labelEn?: string | null;
      labelFr?: string | null;
    }>(row.Level);
    return {
      levelId: row.levelId,
      levelName: levelLabel(level),
    };
  });

  if (levels.length > 0) {
    return levels;
  }

  const { data: subject, error: subjectError } = await supabase
    .from('Subject')
    .select(
      [
        'levelId',
        embed('Level', FK.Subject_level, 'number, name, labelEn, labelFr'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('id', subjectId)
    .maybeSingle();

  if (subjectError) {
    throw subjectError;
  }
  const subjectRow = subject as unknown as EmbeddedLevelRow | null;
  if (!subjectRow?.levelId) {
    return [];
  }

  const primaryLevel = unwrapRelation<{
    number?: number;
    name?: string;
    labelEn?: string | null;
    labelFr?: string | null;
  }>(subjectRow.Level);

  return [
    {
      levelId: subjectRow.levelId,
      levelName: levelLabel(primaryLevel),
    },
  ];
}

export async function fetchTeacherSchemeListItems(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
): Promise<SchemeListItem[]> {
  const scope = await fetchTeacherTeachingScope(
    supabase,
    tenantId,
    academicYearId,
    staffProfileId,
  );
  if (scope.pairs.length === 0) {
    return [];
  }

  const classIds = Array.from(new Set(scope.pairs.map((pair) => pair.classId)));
  const { data: classRows, error: classError } = await supabase
    .from('Class')
    .select(
      [
        'id, name, levelId',
        embed('Level', 'Class_levelId_tenantId_fkey', 'number, name, labelEn, labelFr'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .in('id', classIds);

  if (classError) {
    throw classError;
  }

  const classById = new Map<
    string,
    { name: string; levelId: string; levelName: string }
  >();
  for (const row of (classRows ?? []) as unknown as ClassWithLevelRow[]) {
    const level = unwrapRelation<{
      number?: number;
      name?: string;
      labelEn?: string | null;
      labelFr?: string | null;
    }>(row.Level);
    classById.set(row.id, {
      name: row.name || '',
      levelId: row.levelId,
      levelName: levelLabel(level),
    });
  }

  const subjectIds = Array.from(new Set(scope.pairs.map((pair) => pair.subjectId)));
  const { data: schemeRows, error: schemeError } = await supabase
    .from('SchemeOfWork')
    .select('id, subjectId, levelId, status')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('status', 'PUBLISHED')
    .in('subjectId', subjectIds);

  if (schemeError) {
    throw schemeError;
  }

  const schemeByKey = new Map<
    string,
    { id: string; status: SchemeOfWorkStatus }
  >();
  for (const row of schemeRows ?? []) {
    schemeByKey.set(`${row.subjectId}:${row.levelId}`, {
      id: row.id as string,
      status: asSchemeStatus(row.status as string),
    });
  }

  const schemeIds = (schemeRows ?? []).map((row) => row.id as string);
  const topicCountByScheme = new Map<string, number>();
  const topicsByScheme = new Map<string, string[]>();
  if (schemeIds.length > 0) {
    const { data: topicRows, error: topicError } = await supabase
      .from('SchemeOfWorkTopic')
      .select('id, schemeOfWorkId')
      .eq('tenantId', tenantId)
      .in('schemeOfWorkId', schemeIds);
    if (topicError) {
      throw topicError;
    }
    for (const row of topicRows ?? []) {
      const schemeId = row.schemeOfWorkId as string;
      topicCountByScheme.set(schemeId, (topicCountByScheme.get(schemeId) ?? 0) + 1);
      const topicIds = topicsByScheme.get(schemeId) ?? [];
      topicIds.push(row.id as string);
      topicsByScheme.set(schemeId, topicIds);
    }
  }

  const allTopicIds = Array.from(topicsByScheme.values()).flat();
  const completedByClassTopic = new Set<string>();
  if (allTopicIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from('SchemeOfWorkTopicProgress')
      .select('topicId, classId')
      .eq('tenantId', tenantId)
      .in('classId', classIds)
      .in('topicId', allTopicIds);
    if (progressError) {
      throw progressError;
    }
    for (const row of progressRows ?? []) {
      completedByClassTopic.add(`${row.classId}:${row.topicId}`);
    }
  }

  return scope.pairs.map((pair) => {
    const classInfo = classById.get(pair.classId);
    const levelId = classInfo?.levelId ?? '';
    const scheme = schemeByKey.get(`${pair.subjectId}:${levelId}`);
    const topicIds = scheme ? (topicsByScheme.get(scheme.id) ?? []) : [];
    const completedCount = topicIds.filter((topicId) =>
      completedByClassTopic.has(`${pair.classId}:${topicId}`),
    ).length;

    return {
      schemeId: scheme?.id ?? null,
      subjectId: pair.subjectId,
      subjectCode: '',
      subjectName: pair.subjectName,
      levelId,
      levelName: classInfo?.levelName ?? '',
      classId: pair.classId,
      className: classInfo?.name || pair.className,
      status: scheme?.status ?? null,
      topicCount: scheme ? (topicCountByScheme.get(scheme.id) ?? 0) : 0,
      completedCount,
    };
  });
}

export async function fetchStudentSchemeListItems(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  classId: string,
): Promise<SchemeListItem[]> {
  const { data: classRow, error: classError } = await supabase
    .from('Class')
    .select(
      [
        'id, name, levelId',
        embed('Level', 'Class_levelId_tenantId_fkey', 'number, name, labelEn, labelFr'),
      ].join(', '),
    )
    .eq('tenantId', tenantId)
    .eq('id', classId)
    .maybeSingle();

  if (classError) {
    throw classError;
  }
  if (!classRow) {
    return [];
  }

  const level = unwrapRelation<{
    number?: number;
    name?: string;
    labelEn?: string | null;
    labelFr?: string | null;
  }>((classRow as unknown as ClassWithLevelRow).Level);
  const classWithLevel = classRow as unknown as ClassWithLevelRow;
  const levelId = classWithLevel.levelId;
  const levelName = levelLabel(level);
  const className = classWithLevel.name || '';

  const subjects = await fetchClassSubjectDisplayRows(supabase, tenantId, classId);
  if (subjects.length === 0) {
    return [];
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const { data: schemeRows, error: schemeError } = await supabase
    .from('SchemeOfWork')
    .select('id, subjectId, status')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('levelId', levelId)
    .eq('status', 'PUBLISHED')
    .in('subjectId', subjectIds);

  if (schemeError) {
    throw schemeError;
  }

  const schemeBySubject = new Map<string, { id: string; status: SchemeOfWorkStatus }>();
  for (const row of schemeRows ?? []) {
    schemeBySubject.set(row.subjectId as string, {
      id: row.id as string,
      status: asSchemeStatus(row.status as string),
    });
  }

  const schemeIds = (schemeRows ?? []).map((row) => row.id as string);
  const topicCountByScheme = new Map<string, number>();
  const topicsByScheme = new Map<string, string[]>();
  if (schemeIds.length > 0) {
    const { data: topicRows, error: topicError } = await supabase
      .from('SchemeOfWorkTopic')
      .select('id, schemeOfWorkId')
      .eq('tenantId', tenantId)
      .in('schemeOfWorkId', schemeIds);
    if (topicError) {
      throw topicError;
    }
    for (const row of topicRows ?? []) {
      const schemeId = row.schemeOfWorkId as string;
      topicCountByScheme.set(schemeId, (topicCountByScheme.get(schemeId) ?? 0) + 1);
      const topicIds = topicsByScheme.get(schemeId) ?? [];
      topicIds.push(row.id as string);
      topicsByScheme.set(schemeId, topicIds);
    }
  }

  const allTopicIds = Array.from(topicsByScheme.values()).flat();
  const completedTopicIds = new Set<string>();
  if (allTopicIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from('SchemeOfWorkTopicProgress')
      .select('topicId')
      .eq('tenantId', tenantId)
      .eq('classId', classId)
      .in('topicId', allTopicIds);
    if (progressError) {
      throw progressError;
    }
    for (const row of progressRows ?? []) {
      completedTopicIds.add(row.topicId as string);
    }
  }

  return subjects.map((subject) => {
    const scheme = schemeBySubject.get(subject.id);
    const topicIds = scheme ? (topicsByScheme.get(scheme.id) ?? []) : [];
    return {
      schemeId: scheme?.id ?? null,
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: localizedText(subject.nameEn, subject.nameFr) || subject.nameEn,
      levelId,
      levelName,
      classId,
      className,
      status: scheme?.status ?? null,
      topicCount: scheme ? (topicCountByScheme.get(scheme.id) ?? 0) : 0,
      completedCount: topicIds.filter((topicId) => completedTopicIds.has(topicId)).length,
    };
  });
}

export async function fetchSchemesForYear(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
): Promise<AdminSchemeYearRow[]> {
  const { data, error } = await supabase
    .from('SchemeOfWork')
    .select('id, subjectId, levelId, status')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId);

  if (error) {
    throw error;
  }

  const schemeIds = (data ?? []).map((row) => row.id as string);
  const topicCountByScheme = new Map<string, number>();
  if (schemeIds.length > 0) {
    const { data: topicRows, error: topicError } = await supabase
      .from('SchemeOfWorkTopic')
      .select('id, schemeOfWorkId')
      .eq('tenantId', tenantId)
      .in('schemeOfWorkId', schemeIds);
    if (topicError) {
      throw topicError;
    }
    for (const row of topicRows ?? []) {
      const schemeId = row.schemeOfWorkId as string;
      topicCountByScheme.set(schemeId, (topicCountByScheme.get(schemeId) ?? 0) + 1);
    }
  }

  return (data ?? []).map((row) => ({
    schemeId: row.id as string,
    subjectId: row.subjectId as string,
    levelId: row.levelId as string,
    status: asSchemeStatus(row.status as string),
    topicCount: topicCountByScheme.get(row.id as string) ?? 0,
  }));
}

export async function fetchSchemesForSubjectYear(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  subjectId: string,
): Promise<Array<{ schemeId: string; levelId: string; status: SchemeOfWorkStatus }>> {
  const { data, error } = await supabase
    .from('SchemeOfWork')
    .select('id, levelId, status')
    .eq('tenantId', tenantId)
    .eq('academicYearId', academicYearId)
    .eq('subjectId', subjectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    schemeId: row.id as string,
    levelId: row.levelId as string,
    status: asSchemeStatus(row.status as string),
  }));
}

export async function teacherCanMarkClassSubject(
  supabase: Client,
  tenantId: string,
  academicYearId: string,
  staffProfileId: string,
  classId: string,
  subjectId: string,
): Promise<boolean> {
  const scope = await fetchTeacherTeachingScope(
    supabase,
    tenantId,
    academicYearId,
    staffProfileId,
  );
  return scope.pairs.some(
    (pair) => pair.classId === classId && pair.subjectId === subjectId,
  );
}
