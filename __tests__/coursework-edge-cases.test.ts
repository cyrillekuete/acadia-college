import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_COURSEWORK_MAX_SCORE,
  canManageCourseworkMaterials,
  courseworkTaskListFilters,
  materialHasSubmissionsMessage,
  requiresPositiveMaxScore,
} from '@/lib/acadia/coursework';
import { subjectMaterialSchema } from '@/lib/acadia/subject-schemas';
import { localDateTimeInputToIso } from '@/lib/acadia/dates';

describe('coursework helpers', () => {
  it('filters published tasks for students only', () => {
    expect(courseworkTaskListFilters('student')).toEqual([
      { column: 'isPublished', value: true },
    ]);
    expect(courseworkTaskListFilters('teacher')).toEqual([]);
    expect(courseworkTaskListFilters('admin')).toEqual([]);
  });

  it('lets operations roles manage materials', () => {
    expect(canManageCourseworkMaterials('teacher')).toBe(true);
    expect(canManageCourseworkMaterials('admin')).toBe(true);
    expect(canManageCourseworkMaterials('student')).toBe(false);
    expect(canManageCourseworkMaterials('bursar')).toBe(false);
  });

  it('requires positive max score when published', () => {
    expect(requiresPositiveMaxScore(true, 0)).toBe(true);
    expect(requiresPositiveMaxScore(true, 1)).toBe(false);
    expect(requiresPositiveMaxScore(false, 0)).toBe(false);
    expect(DEFAULT_COURSEWORK_MAX_SCORE).toBe(20);
  });

  it('describes delete blocks when submissions exist', () => {
    expect(materialHasSubmissionsMessage(1)).toMatch(/1 submission/);
    expect(materialHasSubmissionsMessage(3)).toMatch(/3 submissions/);
  });
});

describe('subjectMaterialSchema published max score', () => {
  it('rejects published materials with maxScore 0', () => {
    expect(
      subjectMaterialSchema.safeParse({
        academicYearId: 'year-1',
        titleEn: 'Chapter 1',
        titleFr: 'Chapitre 1',
        dueAt: '2026-09-01T12:00',
        maxScore: 0,
        isPublished: true,
      }).success,
    ).toBe(false);
  });

  it('allows draft materials with maxScore 0', () => {
    expect(
      subjectMaterialSchema.safeParse({
        academicYearId: 'year-1',
        titleEn: 'Chapter 1',
        titleFr: 'Chapitre 1',
        dueAt: '2026-09-01T12:00',
        maxScore: 0,
        isPublished: false,
      }).success,
    ).toBe(true);
  });
});

describe('coursework dueAt UTC conversion', () => {
  it('converts datetime-local values to ISO UTC', () => {
    const iso = localDateTimeInputToIso('2026-09-01T14:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(iso?.endsWith('Z')).toBe(true);
  });
});

describe('coursework RLS migration', () => {
  it('guards student grading updates and unique submissions', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260820220000_coursework_scheme_edge_cases.sql',
      ),
      'utf8',
    );
    expect(sql).toMatch(/CourseworkSubmission_tenant_task_student_uidx/);
    expect(sql).toMatch(/acadia_coursework_submission_student_guard/);
    expect(sql).toMatch(/Students cannot change grading fields/);
    expect(sql).toMatch(/"isPublished" = true/);
    expect(sql).toMatch(/acadia_can_view_scheme_of_work/);
    expect(sql).toMatch(/Only published schemes can record topic coverage/);
    expect(sql).toMatch(/Class level does not match this scheme of work/);
  });
});
