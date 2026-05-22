import { describe, expect, it } from 'vitest';
import {
  canViewTimetableSlots,
  isTimetablePublished,
  timetablePublishStatusLabel,
} from '@/lib/acadia/timetable-publish';

describe('isTimetablePublished', () => {
  it('returns false for empty values', () => {
    expect(isTimetablePublished(null)).toBe(false);
    expect(isTimetablePublished(undefined)).toBe(false);
    expect(isTimetablePublished('')).toBe(false);
  });

  it('returns true when a timestamp is set', () => {
    expect(isTimetablePublished('2026-05-22T12:00:00.000Z')).toBe(true);
  });
});

describe('canViewTimetableSlots', () => {
  it('allows administrators regardless of publish state', () => {
    expect(canViewTimetableSlots('admin', null)).toBe(true);
    expect(canViewTimetableSlots('registrar', null)).toBe(true);
  });

  it('blocks non-admin users until published', () => {
    expect(canViewTimetableSlots('student', null)).toBe(false);
    expect(canViewTimetableSlots('teacher', null)).toBe(false);
    expect(canViewTimetableSlots('guardian', null)).toBe(false);
  });

  it('allows non-admin users after publish', () => {
    const publishedAt = '2026-05-22T12:00:00.000Z';
    expect(canViewTimetableSlots('student', publishedAt)).toBe(true);
    expect(canViewTimetableSlots('teacher', publishedAt)).toBe(true);
  });
});

describe('timetablePublishStatusLabel', () => {
  it('maps publish timestamp to status labels', () => {
    expect(timetablePublishStatusLabel(null)).toBe('draft');
    expect(timetablePublishStatusLabel('2026-05-22T12:00:00.000Z')).toBe('published');
  });
});
