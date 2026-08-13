import { describe, expect, it } from 'vitest';
import {
  resolveSubjectsViewMode,
  subjectsViewDescription,
} from '@/lib/acadia/subject-views';
import { toStudentClassSubjectRow } from '@/lib/acadia/student-class-subjects';

describe('resolveSubjectsViewMode', () => {
  it('routes students to student mode', () => {
    expect(resolveSubjectsViewMode('student')).toBe('student');
  });

  it('routes administrators and staff to catalog mode', () => {
    expect(resolveSubjectsViewMode('admin')).toBe('catalog');
    expect(resolveSubjectsViewMode('registrar')).toBe('catalog');
    expect(resolveSubjectsViewMode('teacher')).toBe('catalog');
    expect(resolveSubjectsViewMode('lecturer')).toBe('catalog');
  });

  it('routes other roles to catalog mode', () => {
    expect(resolveSubjectsViewMode('guardian')).toBe('catalog');
    expect(resolveSubjectsViewMode(null)).toBe('catalog');
  });
});

describe('subjectsViewDescription', () => {
  it('returns a description for each mode', () => {
    expect(subjectsViewDescription('student')).toContain('class');
    expect(subjectsViewDescription('catalog')).toContain('catalog');
  });
});

describe('toStudentClassSubjectRow', () => {
  const subject = {
    id: 'sub-1',
    code: 'MATH',
    nameEn: 'Mathematics',
    nameFr: 'Mathématiques',
    coefficient: 4,
    deactivatedAt: null,
    groupingName: 'Core',
    subBranches: [
      { id: 'sb-1', name: 'Algebra', nameFr: null },
      { id: 'sb-2', name: 'Geometry', nameFr: null },
    ],
  };

  it('returns null for deactivated subjects', () => {
    expect(
      toStudentClassSubjectRow({
        subject: { ...subject, deactivatedAt: '2026-01-01T00:00:00.000Z' },
        classGroupingName: null,
        assignedSubBranchIds: null,
      }),
    ).toBeNull();
  });

  it('returns null when the subject is missing', () => {
    expect(
      toStudentClassSubjectRow({
        subject: null,
        classGroupingName: null,
        assignedSubBranchIds: null,
      }),
    ).toBeNull();
  });

  it('prefers the class grouping over the subject default', () => {
    const row = toStudentClassSubjectRow({
      subject,
      classGroupingName: 'Class group',
      assignedSubBranchIds: null,
    });
    expect(row?.groupingName).toBe('Class group');
  });

  it('falls back to the subject grouping when the class has none', () => {
    const row = toStudentClassSubjectRow({
      subject,
      classGroupingName: null,
      assignedSubBranchIds: null,
    });
    expect(row?.groupingName).toBe('Core');
  });

  it('filters sub-branches to those assigned to the class', () => {
    const row = toStudentClassSubjectRow({
      subject,
      classGroupingName: null,
      assignedSubBranchIds: ['sb-2'],
    });
    expect(row?.subBranches).toEqual([
      { id: 'sb-2', name: 'Geometry', nameFr: null },
    ]);
  });
});
