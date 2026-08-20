import { describe, expect, it } from 'vitest';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import {
  CLASS_EXPORT_NAME_PREFIX,
  buildStudentClassCsv,
  escapeCsvValue,
  filterStudentsByExportClass,
  findClassExportOptionByName,
  formatStudentForClassExport,
  getStudentClassExportOptions,
  slugifyExportToken,
  sortStudentsForClassExport,
  studentClassExportFilename,
  studentMatchesExportClass,
  studentsForClassExport,
} from '@/lib/acadia/student-class-export';

function student(overrides: Partial<StudentListItem> = {}): StudentListItem {
  return {
    id: 'profile-1',
    student_id: 'STU-1',
    registration_number: 'STU-1',
    first_name: 'Ada',
    last_name: 'Ngono',
    email: 'ada@example.com',
    avatar: null,
    class_id: 'class-a',
    class_name: 'Form 5A',
    subsystem: 'ENGLISH',
    branch: 'GRAMMAR',
    matricule_number: 'MAT-1',
    enrollment_status: 'active',
    status: 'active',
    enrollment_date: '2026-01-01T00:00:00.000Z',
    email_verified: true,
    total_fees: 10000,
    paid_fees: 4000,
    fees_status: 'partial',
    ...overrides,
  };
}

describe('getStudentClassExportOptions', () => {
  it('builds unique class options from students and sorts by name', () => {
    const options = getStudentClassExportOptions([
      student({ id: '2', class_id: 'class-b', class_name: 'Form 5B' }),
      student({ id: '1', class_id: 'class-a', class_name: 'Form 5A' }),
      student({ id: '3', class_id: 'class-a', class_name: 'Form 5A' }),
    ]);

    expect(options).toEqual([
      { id: 'class-a', name: 'Form 5A' },
      { id: 'class-b', name: 'Form 5B' },
    ]);
  });

  it('includes teacher-assigned classes even when they have no students', () => {
    const options = getStudentClassExportOptions(
      [student()],
      [
        { classId: 'class-a', className: 'Form 5A' },
        { classId: 'class-c', className: 'Form 5C' },
      ],
    );

    expect(options.map((option) => option.id)).toEqual(['class-a', 'class-c']);
  });

  it('falls back to a name-prefixed id when class_id is missing', () => {
    const options = getStudentClassExportOptions([
      student({ class_id: null, class_name: 'Form 4A' }),
    ]);

    expect(options).toEqual([
      { id: `${CLASS_EXPORT_NAME_PREFIX}Form 4A`, name: 'Form 4A' },
    ]);
  });
});

describe('filterStudentsByExportClass', () => {
  it('keeps only students in the selected class id', () => {
    const students = [
      student({ id: 'a', class_id: 'class-a', class_name: 'Form 5A' }),
      student({ id: 'b', class_id: 'class-b', class_name: 'Form 5B' }),
    ];

    expect(
      filterStudentsByExportClass(students, { id: 'class-b', name: 'Form 5B' }).map(
        (row) => row.id,
      ),
    ).toEqual(['b']);
  });

  it('ignores a tampered class id that is not in the loaded list', () => {
    const students = [student()];

    expect(
      filterStudentsByExportClass(students, {
        id: 'other-class',
        name: 'Other',
      }),
    ).toEqual([]);
  });

  it('matches by class name when the option uses a name prefix', () => {
    const students = [
      student({ id: 'a', class_id: null, class_name: 'Form 4A' }),
      student({ id: 'b', class_id: null, class_name: 'Form 4B' }),
    ];

    expect(
      studentMatchesExportClass(students[0], {
        id: `${CLASS_EXPORT_NAME_PREFIX}Form 4A`,
        name: 'Form 4A',
      }),
    ).toBe(true);
    expect(
      filterStudentsByExportClass(students, {
        id: `${CLASS_EXPORT_NAME_PREFIX}Form 4A`,
        name: 'Form 4A',
      }).map((row) => row.id),
    ).toEqual(['a']);
  });
});

describe('sortStudentsForClassExport', () => {
  it('sorts by last name then first name', () => {
    const sorted = sortStudentsForClassExport([
      student({ id: '2', first_name: 'Zoe', last_name: 'Bella' }),
      student({ id: '1', first_name: 'Ada', last_name: 'Bella' }),
      student({ id: '3', first_name: 'Ada', last_name: 'Ngono' }),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(['1', '2', '3']);
  });
});

describe('buildStudentClassCsv', () => {
  it('includes a UTF-8 BOM, header row, and escaped values', () => {
    const csv = buildStudentClassCsv(
      [
        student({
          first_name: 'Marie, Claire',
          last_name: 'Ngo "A"',
          email: 'marie@example.com',
        }),
      ],
      { id: 'class-a', name: 'Form 5A' },
    );

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Student ID,Matricule,First name,Last name');
    expect(csv).toContain('"Marie, Claire"');
    expect(csv).toContain('"Ngo ""A"""');
    expect(csv).toContain('\r\n');
  });

  it('keeps the header row when the class has no students', () => {
    const csv = buildStudentClassCsv([], {
      id: 'class-empty',
      name: 'Form 5C',
    });

    const body = csv.replace(/^\uFEFF/, '');
    expect(body.split('\r\n')).toHaveLength(1);
    expect(body).toContain('Student ID');
  });

  it('exports only the selected class', () => {
    const csv = buildStudentClassCsv(
      [
        student({
          id: 'a',
          registration_number: 'STU-A',
          class_id: 'class-a',
        }),
        student({
          id: 'b',
          registration_number: 'STU-B',
          class_id: 'class-b',
          class_name: 'Form 5B',
        }),
      ],
      { id: 'class-a', name: 'Form 5A' },
    );

    expect(csv).toContain('STU-A');
    expect(csv).not.toContain('STU-B');
  });
});

describe('escapeCsvValue', () => {
  it('quotes commas, quotes, and newlines', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line\nbreak')).toBe('"line\nbreak"');
  });
});

describe('studentClassExportFilename', () => {
  it('slugifies the class and academic year', () => {
    expect(studentClassExportFilename('Form 5A', '2025/2026')).toBe(
      'students-form-5a-2025-2026.csv',
    );
  });

  it('omits the year when it is missing', () => {
    expect(studentClassExportFilename('Form 5A')).toBe('students-form-5a.csv');
  });

  it('strips accents from tokens', () => {
    expect(slugifyExportToken('Classe 3ème')).toBe('classe-3eme');
  });
});

describe('findClassExportOptionByName', () => {
  it('returns the matching option for a registry class filter', () => {
    const options = getStudentClassExportOptions([student()]);
    expect(findClassExportOptionByName(options, 'Form 5A')?.id).toBe('class-a');
    expect(findClassExportOptionByName(options, null)).toBeNull();
  });
});

describe('formatStudentForClassExport', () => {
  it('maps list fields into export columns', () => {
    const row = formatStudentForClassExport(student());
    expect(row.studentId).toBe('STU-1');
    expect(row.matricule).toBe('MAT-1');
    expect(row.firstName).toBe('Ada');
    expect(row.lastName).toBe('Ngono');
    expect(row.enrollmentStatus).toBe('Active');
    expect(row.feesStatus).toBe('Partial');
    expect(row.feesAmounts).toContain('/');
  });
});

describe('studentsForClassExport', () => {
  it('filters then sorts', () => {
    const rows = studentsForClassExport(
      [
        student({
          id: 'z',
          first_name: 'Zoe',
          last_name: 'Bella',
          class_id: 'class-a',
        }),
        student({
          id: 'skip',
          class_id: 'class-b',
          class_name: 'Form 5B',
        }),
        student({
          id: 'a',
          first_name: 'Ada',
          last_name: 'Bella',
          class_id: 'class-a',
        }),
      ],
      { id: 'class-a', name: 'Form 5A' },
    );

    expect(rows.map((row) => row.id)).toEqual(['a', 'z']);
  });

  it('excludes withdrawn students unless includeWithdrawn is set', () => {
    const students = [
      student({ id: 'active', class_id: 'class-a', enrollment_status: 'active' }),
      student({
        id: 'out',
        class_id: 'class-a',
        enrollment_status: 'inactive',
      }),
    ];
    expect(
      studentsForClassExport(students, { id: 'class-a', name: 'Form 5A' }).map(
        (row) => row.id,
      ),
    ).toEqual(['active']);
    expect(
      studentsForClassExport(students, { id: 'class-a', name: 'Form 5A' }, true).map(
        (row) => row.id,
      ),
    ).toEqual(['active', 'out']);
  });
});
