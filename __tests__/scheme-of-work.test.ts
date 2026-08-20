import { describe, expect, it } from 'vitest';
import {
  attachTopicProgress,
  buildAdminSchemeCatalog,
  buildTopicTree,
  canPublishScheme,
  cascadeProgressTopicIds,
  filterAdminSchemeCatalog,
  nextTopicSortOrder,
  previousAcademicYearId,
  resolveAllowedSchemeClassId,
  schemeProgressPercent,
  schemeShouldBlockProgressWrites,
  topicCheckState,
  type SchemeOfWorkTopicProgressRecord,
  type SchemeOfWorkTopicRecord,
} from '@/lib/acadia/scheme-of-work';
import { schemeOfWorkTopicSchema } from '@/lib/acadia/scheme-of-work-schemas';
import { ACADEMIC_YEAR_SCOPED_TABLES } from '@/lib/acadia/academic-year-scope';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { getMenuForRole } from '@/config/menu.acadia';

function topic(
  overrides: Partial<SchemeOfWorkTopicRecord> & Pick<SchemeOfWorkTopicRecord, 'id'>,
): SchemeOfWorkTopicRecord {
  return {
    tenantId: 't1',
    schemeOfWorkId: 'sow-1',
    parentTopicId: null,
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

  it('builds a topic tree and keeps sibling sort order', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'root-b', sortOrder: 1, titleEn: 'B' }),
        topic({ id: 'root-a', sortOrder: 0, titleEn: 'A' }),
        topic({ id: 'child-2', parentTopicId: 'root-a', sortOrder: 1, titleEn: 'A2' }),
        topic({ id: 'child-1', parentTopicId: 'root-a', sortOrder: 0, titleEn: 'A1' }),
      ],
      new Map(),
    );

    const tree = buildTopicTree(topics);

    expect(tree.map((node) => node.id)).toEqual(['root-a', 'root-b']);
    expect(tree[0]?.children.map((child) => child.id)).toEqual(['child-1', 'child-2']);
    expect(tree[1]?.children).toEqual([]);
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

  it('assigns the next sort order among siblings', () => {
    expect(
      nextTopicSortOrder(
        [
          topic({ id: '1', parentTopicId: null, sortOrder: 0 }),
          topic({ id: '2', parentTopicId: null, sortOrder: 2 }),
          topic({ id: '3', parentTopicId: '1', sortOrder: 9 }),
        ],
        null,
      ),
    ).toBe(3);
    expect(
      nextTopicSortOrder(
        [
          topic({ id: '1', parentTopicId: null, sortOrder: 0 }),
          topic({ id: '3', parentTopicId: '1', sortOrder: 9 }),
        ],
        '1',
      ),
    ).toBe(10);
  });

  it('cascades parent completion to all children', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'parent' }),
        topic({ id: 'c1', parentTopicId: 'parent' }),
        topic({ id: 'c2', parentTopicId: 'parent', sortOrder: 1 }),
      ],
      new Map(),
    );

    expect(cascadeProgressTopicIds(topics, 'parent', true).sort()).toEqual([
      'c1',
      'c2',
      'parent',
    ]);
    expect(cascadeProgressTopicIds(topics, 'parent', false).sort()).toEqual([
      'c1',
      'c2',
      'parent',
    ]);
  });

  it('auto-completes the parent when the last child is completed', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'parent' }),
        topic({ id: 'c1', parentTopicId: 'parent' }),
        topic({ id: 'c2', parentTopicId: 'parent', sortOrder: 1 }),
      ],
      new Map([
        [
          'c1',
          {
            id: 'p1',
            tenantId: 't1',
            topicId: 'c1',
            classId: 'class-a',
            completedAt: '2026-02-01',
            completedByStaffProfileId: 'staff-1',
          },
        ],
      ]),
    );

    expect(cascadeProgressTopicIds(topics, 'c2', true).sort()).toEqual(['c2', 'parent']);
    expect(cascadeProgressTopicIds(topics, 'c1', false).sort()).toEqual(['c1', 'parent']);
  });

  it('does not auto-complete the parent until every sibling is done', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'parent' }),
        topic({ id: 'c1', parentTopicId: 'parent' }),
        topic({ id: 'c2', parentTopicId: 'parent', sortOrder: 1 }),
      ],
      new Map(),
    );

    expect(cascadeProgressTopicIds(topics, 'c1', true)).toEqual(['c1']);
  });

  it('reports mixed child progress as indeterminate', () => {
    const topics = attachTopicProgress(
      [
        topic({ id: 'parent' }),
        topic({ id: 'c1', parentTopicId: 'parent' }),
        topic({ id: 'c2', parentTopicId: 'parent', sortOrder: 1 }),
      ],
      new Map([
        [
          'c1',
          {
            id: 'p1',
            tenantId: 't1',
            topicId: 'c1',
            classId: 'class-a',
            completedAt: '2026-02-01',
            completedByStaffProfileId: 'staff-1',
          },
        ],
      ]),
    );
    const tree = buildTopicTree(topics);
    expect(topicCheckState(tree[0]!, tree[0]!.children)).toBe('indeterminate');
  });

  it('accepts a topic without term or week and optional parentTopicId', () => {
    const root = schemeOfWorkTopicSchema.safeParse({
      titleEn: 'Topic',
      titleFr: 'Thème',
    });
    const child = schemeOfWorkTopicSchema.safeParse({
      parentTopicId: 'parent-1',
      titleEn: 'Sub-topic',
      titleFr: 'Sous-thème',
    });
    expect(root.success).toBe(true);
    expect(child.success).toBe(true);
  });
  it('rejects a blank title', () => {
    const result = schemeOfWorkTopicSchema.safeParse({
      parentTopicId: '',
      titleEn: '   ',
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

describe('scheme of work safety helpers', () => {
  it('blocks publishing a scheme with no topics', () => {
    expect(canPublishScheme(0)).toBe(false);
    expect(canPublishScheme(1)).toBe(true);
  });

  it('resolves the previous academic year from newest-first order', () => {
    expect(
      previousAcademicYearId(
        [{ id: 'year-2026' }, { id: 'year-2025' }, { id: 'year-2024' }],
        'year-2026',
      ),
    ).toBe('year-2025');
    expect(previousAcademicYearId([{ id: 'year-2026' }], 'year-2026')).toBeNull();
  });

  it('ignores a student classId that is not their enrollment', () => {
    expect(
      resolveAllowedSchemeClassId({
        requestedClassId: 'other-class',
        roleSlug: 'student',
        studentClassId: 'enrolled-class',
        teacherClassIds: [],
        isAcademicAdmin: false,
      }),
    ).toBeNull();
    expect(
      resolveAllowedSchemeClassId({
        requestedClassId: 'enrolled-class',
        roleSlug: 'student',
        studentClassId: 'enrolled-class',
        teacherClassIds: [],
        isAcademicAdmin: false,
      }),
    ).toBe('enrolled-class');
  });

  it('ignores a teacher classId outside teaching scope', () => {
    expect(
      resolveAllowedSchemeClassId({
        requestedClassId: 'foreign-class',
        roleSlug: 'teacher',
        studentClassId: null,
        teacherClassIds: ['taught-class'],
        isAcademicAdmin: false,
      }),
    ).toBeNull();
  });

  it('blocks progress writes on draft or other-year schemes', () => {
    expect(
      schemeShouldBlockProgressWrites({
        schemeAcademicYearId: 'year-a',
        activeYearId: 'year-a',
        status: 'PUBLISHED',
      }),
    ).toBe(false);
    expect(
      schemeShouldBlockProgressWrites({
        schemeAcademicYearId: 'year-a',
        activeYearId: 'year-b',
        status: 'PUBLISHED',
      }),
    ).toBe(true);
    expect(
      schemeShouldBlockProgressWrites({
        schemeAcademicYearId: 'year-a',
        activeYearId: 'year-a',
        status: 'DRAFT',
      }),
    ).toBe(true);
  });

  it('requires French topic titles', () => {
    expect(
      schemeOfWorkTopicSchema.safeParse({
        titleEn: 'Fractions',
        titleFr: '',
      }).success,
    ).toBe(false);
    expect(
      schemeOfWorkTopicSchema.safeParse({
        titleEn: 'Fractions',
        titleFr: 'Fractions',
      }).success,
    ).toBe(true);
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

  it('does not let bursar write schemes of work', () => {
    expect(canWriteAcademicAdmin('bursar')).toBe(false);
    expect(canWriteAcademicAdmin('registrar')).toBe(true);
  });
});
