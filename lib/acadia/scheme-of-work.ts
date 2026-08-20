import { localizedText } from '@/lib/acadia/locale';
import { isStaffOrTeacher, isStudent } from '@/lib/acadia/roles';

export const SCHEME_OF_WORK_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type SchemeOfWorkStatus = (typeof SCHEME_OF_WORK_STATUSES)[number];

export type SchemeOfWorkRecord = {
  id: string;
  tenantId: string;
  academicYearId: string;
  subjectId: string;
  levelId: string;
  status: SchemeOfWorkStatus;
  createdAt: string;
  updatedAt: string;
};

export type SchemeOfWorkTopicRecord = {
  id: string;
  tenantId: string;
  schemeOfWorkId: string;
  parentTopicId: string | null;
  titleEn: string;
  titleFr: string;
  descriptionEn: string | null;
  descriptionFr: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SchemeOfWorkTopicProgressRecord = {
  id: string;
  tenantId: string;
  topicId: string;
  classId: string;
  completedAt: string;
  completedByStaffProfileId: string | null;
};

export type SchemeTermOption = {
  id: string;
  number: number;
};

export type SchemeTopicWithProgress = SchemeOfWorkTopicRecord & {
  completed: boolean;
  completedAt: string | null;
  completedByStaffProfileId: string | null;
};

export type SchemeTopicTreeNode = SchemeTopicWithProgress & {
  children: SchemeTopicTreeNode[];
};

export type SchemeListItem = {
  schemeId: string | null;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  levelId: string;
  levelName: string;
  classId?: string;
  className?: string;
  status: SchemeOfWorkStatus | null;
  topicCount: number;
  completedCount: number;
};

export type AdminSchemeYearRow = {
  schemeId: string;
  subjectId: string;
  levelId: string;
  status: SchemeOfWorkStatus;
  topicCount: number;
};

export type AdminSchemeCatalogLevel = {
  levelId: string;
  levelName: string;
  schemeId: string | null;
  status: SchemeOfWorkStatus | null;
  topicCount: number;
};

export type AdminSchemeCatalogSubject = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  levels: AdminSchemeCatalogLevel[];
};

export type AdminSchemeCatalogSubjectInput = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  deactivatedAt?: string | null;
  levels: Array<{ levelId: string; levelName: string }>;
};

export function isSchemeOfWorkStatus(value: string | null | undefined): value is SchemeOfWorkStatus {
  return SCHEME_OF_WORK_STATUSES.includes(value as SchemeOfWorkStatus);
}

export function schemeProgressPercent(completedCount: number, topicCount: number): number {
  if (topicCount <= 0) {
    return 0;
  }
  return Math.round((Math.max(0, completedCount) / topicCount) * 100);
}

export function topicTitle(topic: Pick<SchemeOfWorkTopicRecord, 'titleEn' | 'titleFr'>): string {
  return localizedText(topic.titleEn, topic.titleFr) || topic.titleEn || topic.titleFr;
}

export function topicDescription(
  topic: Pick<SchemeOfWorkTopicRecord, 'descriptionEn' | 'descriptionFr'>,
): string {
  return localizedText(topic.descriptionEn, topic.descriptionFr);
}

export function attachTopicProgress(
  topics: SchemeOfWorkTopicRecord[],
  progressByTopicId: Map<string, SchemeOfWorkTopicProgressRecord>,
): SchemeTopicWithProgress[] {
  return topics.map((topic) => {
    const progress = progressByTopicId.get(topic.id);
    return {
      ...topic,
      completed: !!progress,
      completedAt: progress?.completedAt ?? null,
      completedByStaffProfileId: progress?.completedByStaffProfileId ?? null,
    };
  });
}

function siblingParentKey(parentTopicId: string | null | undefined): string {
  return parentTopicId ?? '';
}

export function buildTopicTree(topics: SchemeTopicWithProgress[]): SchemeTopicTreeNode[] {
  const childrenByParent = new Map<string, SchemeTopicWithProgress[]>();
  const roots: SchemeTopicWithProgress[] = [];

  for (const topic of topics) {
    const parentId = topic.parentTopicId?.trim() || null;
    if (!parentId) {
      roots.push(topic);
      continue;
    }
    const list = childrenByParent.get(parentId) ?? [];
    list.push(topic);
    childrenByParent.set(parentId, list);
  }

  const sortSiblings = (items: SchemeTopicWithProgress[]) =>
    [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  return sortSiblings(roots).map((root) => ({
    ...root,
    children: sortSiblings(childrenByParent.get(root.id) ?? []).map((child) => ({
      ...child,
      children: [],
    })),
  }));
}

export function nextTopicSortOrder(
  topics: Array<Pick<SchemeOfWorkTopicRecord, 'parentTopicId' | 'sortOrder'>>,
  parentTopicId: string | null,
): number {
  const parentKey = siblingParentKey(parentTopicId);
  let max = -1;
  for (const topic of topics) {
    if (siblingParentKey(topic.parentTopicId) === parentKey) {
      max = Math.max(max, topic.sortOrder);
    }
  }
  return max + 1;
}

export function cascadeProgressTopicIds(
  topics: Array<Pick<SchemeTopicWithProgress, 'id' | 'parentTopicId' | 'completed'>>,
  topicId: string,
  completed: boolean,
): string[] {
  const topic = topics.find((item) => item.id === topicId);
  if (!topic) {
    return [];
  }

  const children = topics.filter((item) => item.parentTopicId === topicId);
  const isParent = !topic.parentTopicId;

  if (isParent) {
    return [topic.id, ...children.map((child) => child.id)];
  }

  if (!completed) {
    return topic.parentTopicId ? [topic.id, topic.parentTopicId] : [topic.id];
  }

  const siblings = topics.filter((item) => item.parentTopicId === topic.parentTopicId);
  const allSiblingsComplete = siblings.every(
    (sibling) => sibling.id === topicId || sibling.completed,
  );
  if (allSiblingsComplete && topic.parentTopicId) {
    return [topic.id, topic.parentTopicId];
  }
  return [topic.id];
}

export function topicCheckState(
  topic: Pick<SchemeTopicWithProgress, 'completed'>,
  children: Array<Pick<SchemeTopicWithProgress, 'completed'>>,
): boolean | 'indeterminate' {
  if (children.length === 0) {
    return topic.completed;
  }
  const completedCount = children.filter((child) => child.completed).length;
  if (completedCount === children.length) {
    return true;
  }
  if (completedCount > 0 || topic.completed) {
    return 'indeterminate';
  }
  return false;
}

export function canViewPublishedSchemeOnly(isAcademicAdmin: boolean): boolean {
  return !isAcademicAdmin;
}

export function schemeShouldBlockProgressWrites(input: {
  schemeAcademicYearId: string;
  activeYearId: string | null | undefined;
  status: SchemeOfWorkStatus;
}): boolean {
  if (input.status !== 'PUBLISHED') {
    return true;
  }
  if (!input.activeYearId) {
    return true;
  }
  return input.schemeAcademicYearId !== input.activeYearId;
}

export function canPublishScheme(topicCount: number): boolean {
  return topicCount > 0;
}

export function previousAcademicYearId(
  years: Array<{ id: string }>,
  activeYearId: string | null | undefined,
): string | null {
  if (!activeYearId) {
    return null;
  }
  const index = years.findIndex((year) => year.id === activeYearId);
  if (index < 0 || index + 1 >= years.length) {
    return null;
  }
  return years[index + 1]?.id ?? null;
}

export function resolveAllowedSchemeClassId(input: {
  requestedClassId: string | null | undefined;
  roleSlug: string | null | undefined;
  studentClassId: string | null | undefined;
  teacherClassIds: string[];
  isAcademicAdmin: boolean;
}): string | null {
  const requested = input.requestedClassId?.trim() || null;
  if (input.isAcademicAdmin) {
    return requested;
  }
  if (isStudent(input.roleSlug)) {
    const enrolled = input.studentClassId?.trim() || null;
    if (!enrolled) {
      return null;
    }
    if (!requested || requested === enrolled) {
      return enrolled;
    }
    return null;
  }
  if (isStaffOrTeacher(input.roleSlug)) {
    if (!requested) {
      return null;
    }
    return input.teacherClassIds.includes(requested) ? requested : null;
  }
  return null;
}

export function buildAdminSchemeCatalog(
  subjects: AdminSchemeCatalogSubjectInput[],
  schemes: AdminSchemeYearRow[],
): AdminSchemeCatalogSubject[] {
  const schemeByKey = new Map(
    schemes.map((scheme) => [`${scheme.subjectId}:${scheme.levelId}`, scheme]),
  );

  return subjects
    .filter((subject) => !subject.deactivatedAt)
    .map((subject) => ({
      subjectId: subject.subjectId,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      levels: subject.levels.map((level) => {
        const scheme = schemeByKey.get(`${subject.subjectId}:${level.levelId}`);
        return {
          levelId: level.levelId,
          levelName: level.levelName,
          schemeId: scheme?.schemeId ?? null,
          status: scheme?.status ?? null,
          topicCount: scheme?.topicCount ?? 0,
        };
      }),
    }));
}

export function filterAdminSchemeCatalog(
  catalog: AdminSchemeCatalogSubject[],
  query: string,
): AdminSchemeCatalogSubject[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return catalog;
  }
  return catalog.filter((subject) => {
    return (
      subject.subjectName.toLowerCase().includes(needle) ||
      subject.subjectCode.toLowerCase().includes(needle)
    );
  });
}
