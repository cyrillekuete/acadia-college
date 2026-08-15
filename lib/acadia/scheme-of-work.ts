import { localizedText } from '@/lib/acadia/locale';

export const SCHEME_OF_WORK_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export type SchemeOfWorkStatus = (typeof SCHEME_OF_WORK_STATUSES)[number];

export const SCHEME_OF_WORK_WEEK_MIN = 1;
export const SCHEME_OF_WORK_WEEK_MAX = 20;

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
  termId: string;
  weekNumber: number;
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

export type SchemeWeekGroup = {
  weekNumber: number;
  topics: SchemeTopicWithProgress[];
};

export type SchemeTermGroup = {
  termId: string;
  termNumber: number;
  weeks: SchemeWeekGroup[];
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

export function groupTopicsByTermAndWeek(
  topics: SchemeTopicWithProgress[],
  terms: SchemeTermOption[],
): SchemeTermGroup[] {
  const topicsByTerm = new Map<string, SchemeTopicWithProgress[]>();
  for (const topic of topics) {
    const list = topicsByTerm.get(topic.termId) ?? [];
    list.push(topic);
    topicsByTerm.set(topic.termId, list);
  }

  const seenTermIds = new Set<string>();
  const groups: SchemeTermGroup[] = [];

  const pushTerm = (termId: string, termNumber: number) => {
    if (seenTermIds.has(termId)) {
      return;
    }
    seenTermIds.add(termId);
    const termTopics = [...(topicsByTerm.get(termId) ?? [])].sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber;
      }
      return a.sortOrder - b.sortOrder;
    });
    const weekMap = new Map<number, SchemeTopicWithProgress[]>();
    for (const topic of termTopics) {
      const weekTopics = weekMap.get(topic.weekNumber) ?? [];
      weekTopics.push(topic);
      weekMap.set(topic.weekNumber, weekTopics);
    }
    const weeks = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNumber, weekTopics]) => ({ weekNumber, topics: weekTopics }));
    groups.push({ termId, termNumber, weeks });
  };

  for (const term of [...terms].sort((a, b) => a.number - b.number)) {
    pushTerm(term.id, term.number);
  }

  const leftoverTermIds = Array.from(topicsByTerm.keys()).filter((id) => !seenTermIds.has(id));
  leftoverTermIds.sort();
  for (const termId of leftoverTermIds) {
    pushTerm(termId, 0);
  }

  return groups;
}

export function nextTopicSortOrder(
  topics: Array<Pick<SchemeOfWorkTopicRecord, 'termId' | 'weekNumber' | 'sortOrder'>>,
  termId: string,
  weekNumber: number,
): number {
  let max = -1;
  for (const topic of topics) {
    if (topic.termId === termId && topic.weekNumber === weekNumber) {
      max = Math.max(max, topic.sortOrder);
    }
  }
  return max + 1;
}

export function canViewPublishedSchemeOnly(isAdmin: boolean): boolean {
  return !isAdmin;
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
