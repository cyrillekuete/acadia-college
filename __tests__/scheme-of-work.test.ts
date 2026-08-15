import { describe, expect, it } from 'vitest';
import {
  attachTopicProgress,
  buildAdminSchemeCatalog,
  filterAdminSchemeCatalog,
  groupTopicsByTermAndWeek,
  nextTopicSortOrder,
  schemeProgressPercent,
  type SchemeOfWorkTopicProgressRecord,
  type SchemeOfWorkTopicRecord,
} from '@/lib/acadia/scheme-of-work';
import { schemeOfWorkTopicSchema } from '@/lib/acadia/scheme-of-work-schemas';
import { ACADEMIC_YEAR_SCOPED_TABLES } from '@/lib/acadia/academic-year-scope';
import { getMenuForRole } from '@/config/menu.acadia';

function topic(
  overrides: Partial<SchemeOfWorkTopicRecord> & Pick<SchemeOfWorkTopicRecord, 'id'>,
): SchemeOfWorkTopicRecord {
  return {
    tenantId: 't1',
    schemeOfWorkId: 'sow-1',
    termId: 'term-1',
    weekNumber: 1,
    titleEn: 'Fractions',
    titleFr: 'Fractions',
    descriptionEn: null,
    descriptionFr: null,
    sortOrder: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('scheme of work helpers', () => {
  it('computes coverage percent', () => {
    expect(schemeProgressPercent(0, 0)).toBe(0);
    expect(schemeProgressPercent(1, 4)).toBe(25);
    expect(schemeProgressPercent(3, 3)).toBe(100);
  });

  it('groups topics by term then week and keeps sort order', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'a', termId: 'term-2', weekNumber: 1, sortOrder: 1, titleEn: 'A2' }),
        topic({ id: 'b', termId: 'term-1', weekNumber: 2, sortOrder: 0, titleEn: 'B' }),
        topic({ id: 'c', termId: 'term-1', weekNumber: 1, sortOrder: 1, titleEn: 'C' }),
        topic({ id: 'd', termId: 'term-1', weekNumber: 1, sortOrder: 0, titleEn: 'D' }),
      ],
      new Map(),
    );

    const groups = groupTopicsByTermAndWeek(topics, [
      { id: 'term-1', number: 1 },
      { id: 'term-2', number: 2 },
    ]);

    expect(groups.map((group) => group.termNumber)).toEqual([1, 2]);
    expect(groups[0]?.weeks.map((week) => week.weekNumber)).toEqual([1, 2]);
    expect(groups[0]?.weeks[0]?.topics.map((item) => item.id)).toEqual(['d', 'c']);
    expect(groups[1]?.weeks[0]?.topics.map((item) => item.id)).toEqual(['a']);
  });

  it('attaches class progress independently per topic map', () => {
    const topics = [
      topic({ id: 'topic-1' }),
      topic({ id: 'topic-2', sortOrder: 1 }),
    ];
    const classA = new Map<string, SchemeOfWorkTopicProgressRecord>([
      [
        'topic-1',
        {
          id: 'p1',
          tenantId: 't1',
          topicId: 'topic-1',
          classId: 'class-a',
          completedAt: '2026-02-01',
          completedByStaffProfileId: 'staff-1',
        },
      ],
    ]);
    const classB = new Map<string, SchemeOfWorkTopicProgressRecord>();

    const coveredA = attachTopicProgress(topics, classA);
    const coveredB = attachTopicProgress(topics, classB);

    expect(coveredA.filter((item) => item.completed).map((item) => item.id)).toEqual([
      'topic-1',
    ]);
    expect(coveredB.every((item) => !item.completed)).toBe(true);
    expect(schemeProgressPercent(1, 2)).toBe(50);
    expect(schemeProgressPercent(0, 2)).toBe(0);
  });

  it('assigns the next sort order within a term week', () => {
    expect(
      nextTopicSortOrder(
        [
          topic({ id: '1', weekNumber: 1, sortOrder: 0 }),
          topic({ id: '2', weekNumber: 1, sortOrder: 2 }),
          topic({ id: '3', weekNumber: 2, sortOrder: 9 }),
        ],
        'term-1',
        1,
      ),
    ).toBe(3);
  });

  it('rejects week numbers outside 1-20', () => {
    const result = schemeOfWorkTopicSchema.safeParse({
      termId: 'term-1',
      weekNumber: 21,
      titleEn: 'Topic',
      titleFr: 'Thème',
    });
    expect(result.success).toBe(false);
  });

  it('scopes schemes to the academic year table list', () => {
    expect(ACADEMIC_YEAR_SCOPED_TABLES.has('SchemeOfWork')).toBe(true);
  });

  it('groups admin catalog subjects with level scheme status', () => {
    const catalog = buildAdminSchemeCatalog(
      [
        {
          subjectId: 'math',
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          levels: [
            { levelId: 'f1', levelName: 'Form 1' },
            { levelId: 'f2', levelName: 'Form 2' },
          ],
        },
        {
          subjectId: 'geo',
          subjectCode: 'GEO',
          subjectName: 'Geography',
          deactivatedAt: '2026-01-01',
          levels: [{ levelId: 'f1', levelName: 'Form 1' }],
        },
        {
          subjectId: 'eng',
          subjectCode: 'ENG',
          subjectName: 'English',
          levels: [],
        },
      ],
      [
        {
          schemeId: 'sow-1',
          subjectId: 'math',
          levelId: 'f1',
          status: 'PUBLISHED',
          topicCount: 4,
        },
      ],
    );

    expect(catalog.map((subject) => subject.subjectId)).toEqual(['math', 'eng']);
    expect(catalog[0]?.levels).toEqual([
      {
        levelId: 'f1',
        levelName: 'Form 1',
        schemeId: 'sow-1',
        status: 'PUBLISHED',
        topicCount: 4,
      },
      {
        levelId: 'f2',
        levelName: 'Form 2',
        schemeId: null,
        status: null,
        topicCount: 0,
      },
    ]);
    expect(catalog[1]?.levels).toEqual([]);
    expect(filterAdminSchemeCatalog(catalog, 'math')).toHaveLength(1);
    expect(filterAdminSchemeCatalog(catalog, 'ENG')).toHaveLength(1);
    expect(filterAdminSchemeCatalog(catalog, 'xyz')).toHaveLength(0);
  });
});

describe('scheme of work menu', () => {
  it('adds scheme of work under subjects for admins', () => {
    const menu = getMenuForRole('admin');
    const subjects = menu.find((item) => item.titleKey === 'nav.subjects');
    expect(subjects?.children?.some((child) => child.path === '/scheme-of-work')).toBe(
      true,
    );
  });

  it('adds a top-level scheme of work item for teachers and students', () => {
    expect(
      getMenuForRole('teacher').some((item) => item.path === '/scheme-of-work'),
    ).toBe(true);
    expect(
      getMenuForRole('student').some((item) => item.path === '/scheme-of-work'),
    ).toBe(true);
  });
});
