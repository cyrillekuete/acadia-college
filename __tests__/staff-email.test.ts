import { describe, expect, it } from 'vitest';
import {
  buildStaffEmailLocalPart,
  slugifyStaffNamePart,
  staffSystemEmailCandidates,
} from '@/lib/acadia/staff-email';

describe('staff-email', () => {
  it('slugifies accented names', () => {
    expect(slugifyStaffNamePart('Jean-Pierre')).toBe('jean.pierre');
    expect(slugifyStaffNamePart('  Ngono  ')).toBe('ngono');
  });

  it('builds firstname.lastname local part', () => {
    expect(buildStaffEmailLocalPart('Alice', 'Ngono')).toBe('alice.ngono');
    expect(buildStaffEmailLocalPart('', 'Mbarga')).toBe('mbarga');
  });

  it('generates dedup suffix candidates', () => {
    const candidates = staffSystemEmailCandidates('Alice', 'Ngono');
    expect(candidates[0]).toBe('alice.ngono@acadia-college.edu');
    expect(candidates[1]).toBe('alice.ngono.2@acadia-college.edu');
    expect(candidates[2]).toBe('alice.ngono.3@acadia-college.edu');
  });
});
