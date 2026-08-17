import { describe, expect, it } from 'vitest';
import {
  activityFromSystemLog,
  categorizeActivity,
  titleFromSystemLogEvent,
} from '@/lib/supabase/queries/admin-dashboard';

describe('titleFromSystemLogEvent', () => {
  it('humanizes dotted event names', () => {
    expect(titleFromSystemLogEvent('student.created')).toBe('Student created');
  });

  it('humanizes underscored event names', () => {
    expect(titleFromSystemLogEvent('exam_session.finalized')).toBe(
      'Exam session finalized',
    );
  });

  it('falls back when the event is missing', () => {
    expect(titleFromSystemLogEvent(null)).toBe('Activity');
    expect(titleFromSystemLogEvent('  ')).toBe('Activity');
  });
});

describe('categorizeActivity', () => {
  it('maps user and account events to auth', () => {
    expect(categorizeActivity('user.created')).toBe('auth');
    expect(categorizeActivity('account.deleted')).toBe('auth');
    expect(categorizeActivity('User login recorded')).toBe('auth');
  });

  it('maps academic events', () => {
    expect(categorizeActivity('student.created')).toBe('academic');
    expect(categorizeActivity('exam_session.finalized')).toBe('academic');
    expect(categorizeActivity('academic_year.rollover')).toBe('academic');
  });

  it('maps report and transcript events', () => {
    expect(categorizeActivity('transcript.ready')).toBe('report');
    expect(categorizeActivity('Annual report generated')).toBe('report');
  });

  it('maps unrelated events to general', () => {
    expect(categorizeActivity('fee_payment.recorded')).toBe('general');
    expect(categorizeActivity('message.sent')).toBe('general');
  });
});

describe('activityFromSystemLog', () => {
  it('maps event, description, and category', () => {
    const item = activityFromSystemLog({
      id: 'log-1',
      event: 'student.created',
      description: 'Ada Lovelace added to Form 1A',
      createdAt: '2026-08-15T01:00:00.000Z',
    });

    expect(item).toEqual({
      id: 'log-1',
      title: 'Student created',
      description: 'Ada Lovelace added to Form 1A',
      createdAt: '2026-08-15T01:00:00.000Z',
      category: 'academic',
    });
  });

  it('builds a fallback description and prefixes the actor name', () => {
    const item = activityFromSystemLog({
      id: 'log-2',
      event: 'user.activated',
      description: null,
      createdAt: '2026-08-15T02:00:00.000Z',
      User: { name: 'Marie Curie' },
    });

    expect(item.title).toBe('User activated');
    expect(item.description).toBe('Marie Curie · User activated recorded successfully');
    expect(item.category).toBe('auth');
  });
});
