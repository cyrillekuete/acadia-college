import { describe, expect, it } from 'vitest';
import {
  resolveTimetableViewMode,
  timetableViewDescription,
} from '@/lib/acadia/timetable-views';

describe('resolveTimetableViewMode', () => {
  it('routes administrators to admin mode', () => {
    expect(resolveTimetableViewMode('admin')).toBe('admin');
    expect(resolveTimetableViewMode('registrar')).toBe('admin');
  });

  it('routes students to student mode', () => {
    expect(resolveTimetableViewMode('student')).toBe('student');
  });

  it('routes teaching staff to teacher mode', () => {
    expect(resolveTimetableViewMode('teacher')).toBe('teacher');
    expect(resolveTimetableViewMode('lecturer')).toBe('teacher');
  });

  it('routes guardians and parents to guardian mode', () => {
    expect(resolveTimetableViewMode('guardian')).toBe('guardian');
    expect(resolveTimetableViewMode('parent')).toBe('guardian');
  });

  it('routes other roles to browse mode', () => {
    expect(resolveTimetableViewMode(null)).toBe('browse');
  });
});

describe('timetableViewDescription', () => {
  it('returns a description for each mode', () => {
    expect(timetableViewDescription('admin')).toContain('Manage');
    expect(timetableViewDescription('teacher')).toContain('teaching');
    expect(timetableViewDescription('student')).toContain('class');
    expect(timetableViewDescription('guardian')).toContain('linked students');
    expect(timetableViewDescription('browse')).toContain('Browse');
  });
});
