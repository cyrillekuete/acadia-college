import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMenuForRole } from '@/config/menu.acadia';
import { tableHasAcademicYearColumn } from '@/lib/acadia/academic-year-scope';
import {
  assertCopyRequestRejectNote,
  canFulfillCopyRequest,
  canIssueReadyTranscript,
  canManageTranscripts,
  canReissueTranscript,
  canRequestTranscriptCopy,
  canResolveCopyRequest,
  canSelfRequestTranscriptCopy,
  canViewTranscripts,
  copyRequestBadgeVariant,
  copyRequestMatchesSearch,
  copyRequestMatchesStudentSet,
  copyRequestRowMatchesStatusFilter,
  copyRequestStudentStanding,
  findDuplicateTranscript,
  hasDuplicatePendingCopyRequest,
  isIssuedTranscript,
  nextTranscriptVersionNumber,
  reissueRequiresReason,
  shouldWarnFeeHold,
  transcriptIdentityKey,
  transcriptMatchesSearch,
  transcriptRowMatchesStatusFilter,
  transcriptVersionBadgeVariant,
} from '@/lib/acadia/transcripts';
import {
  transcriptCopyRequestCreateSchema,
  transcriptCopyRequestReviewSchema,
} from '@/lib/acadia/transcripts-schemas';

function collectMenuPaths(
  items: ReturnType<typeof getMenuForRole>,
): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (item.path) {
      paths.push(item.path.split('?')[0] ?? item.path);
    }
    if (item.children) {
      paths.push(...collectMenuPaths(item.children));
    }
  }
  return [...new Set(paths)];
}

describe('transcript access', () => {
  it('lets admins and teaching staff view, not students or parents', () => {
    expect(canViewTranscripts('admin')).toBe(true);
    expect(canViewTranscripts('bursar')).toBe(true);
    expect(canViewTranscripts('financial-director')).toBe(true);
    expect(canViewTranscripts('teacher')).toBe(true);
    expect(canViewTranscripts('student')).toBe(false);
    expect(canViewTranscripts('parent')).toBe(false);
    expect(canViewTranscripts('guardian')).toBe(false);
  });

  it('lets academic admins manage writes and keeps bursar view-only', () => {
    expect(canManageTranscripts('admin')).toBe(true);
    expect(canManageTranscripts('registrar')).toBe(true);
    expect(canManageTranscripts('financial-director')).toBe(true);
    expect(canManageTranscripts('bursar')).toBe(false);
    expect(canManageTranscripts('teacher')).toBe(false);
    expect(canRequestTranscriptCopy('registrar')).toBe(true);
    expect(canRequestTranscriptCopy('bursar')).toBe(false);
    expect(canRequestTranscriptCopy('student')).toBe(false);
  });

  it('documents future student and guardian self-service separately', () => {
    expect(canSelfRequestTranscriptCopy('student')).toBe(true);
    expect(canSelfRequestTranscriptCopy('parent')).toBe(true);
    expect(canSelfRequestTranscriptCopy('teacher')).toBe(false);
  });
});

describe('transcript menu', () => {
  it('keeps transcripts in bursar and financial-director menus, not student or parent', () => {
    expect(collectMenuPaths(getMenuForRole('bursar'))).toContain('/transcripts');
    expect(collectMenuPaths(getMenuForRole('bursar'))).toContain(
      '/transcripts/requests',
    );
    expect(collectMenuPaths(getMenuForRole('financial-director'))).toContain(
      '/transcripts',
    );
    expect(collectMenuPaths(getMenuForRole('student'))).not.toContain(
      '/transcripts',
    );
    expect(collectMenuPaths(getMenuForRole('parent'))).not.toContain(
      '/transcripts',
    );
    expect(collectMenuPaths(getMenuForRole('guardian'))).not.toContain(
      '/transcripts/requests',
    );
  });

  it('does not year-scope copy requests at the table level', () => {
    expect(tableHasAcademicYearColumn('Transcript')).toBe(true);
    expect(tableHasAcademicYearColumn('TranscriptCopyRequest')).toBe(false);
  });
});

describe('copy request transitions', () => {
  it('allows only pending to fulfilled or rejected', () => {
    expect(canResolveCopyRequest('PENDING', 'FULFILLED')).toBe(true);
    expect(canResolveCopyRequest('PENDING', 'REJECTED')).toBe(true);
    expect(canResolveCopyRequest('FULFILLED', 'PENDING')).toBe(false);
    expect(canResolveCopyRequest('REJECTED', 'FULFILLED')).toBe(false);
    expect(canResolveCopyRequest('FULFILLED', 'REJECTED')).toBe(false);
  });

  it('blocks a second pending request for the same student', () => {
    const existing = [
      { id: 'r1', studentProfileId: 's1', status: 'PENDING' },
      { id: 'r2', studentProfileId: 's1', status: 'FULFILLED' },
    ];
    expect(hasDuplicatePendingCopyRequest(existing, 's1')).toBe(true);
    expect(hasDuplicatePendingCopyRequest(existing, 's1', 'r1')).toBe(false);
    expect(hasDuplicatePendingCopyRequest(existing, 's2')).toBe(false);
  });

  it('fulfills only when a READY transcript exists', () => {
    expect(canFulfillCopyRequest({ hasReadyTranscript: true })).toBe(true);
    expect(canFulfillCopyRequest({ hasReadyTranscript: false })).toBe(false);
    expect(
      canFulfillCopyRequest({
        hasReadyTranscript: true,
        versionStatus: 'FAILED',
      }),
    ).toBe(false);
    expect(
      canFulfillCopyRequest({
        hasReadyTranscript: true,
        versionStatus: 'READY',
      }),
    ).toBe(true);
  });

  it('requires a rejection reason', () => {
    expect(assertCopyRequestRejectNote('FULFILLED', '')).toEqual({ ok: true });
    expect(assertCopyRequestRejectNote('REJECTED', '  ')).toEqual({
      ok: false,
      message: 'A rejection reason is required.',
    });
    expect(assertCopyRequestRejectNote('REJECTED', 'No records')).toEqual({
      ok: true,
    });
  });

  it('warns when fees are outstanding', () => {
    expect(shouldWarnFeeHold(0)).toBe(false);
    expect(shouldWarnFeeHold(1)).toBe(true);
    expect(shouldWarnFeeHold(null)).toBe(false);
  });
});

describe('copy request schemas', () => {
  it('requires a student on create', () => {
    expect(
      transcriptCopyRequestCreateSchema.safeParse({ studentProfileId: '' })
        .success,
    ).toBe(false);
    expect(
      transcriptCopyRequestCreateSchema.safeParse({
        studentProfileId: 's1',
        note: 'Alumni copy',
      }).success,
    ).toBe(true);
  });

  it('requires a note when rejecting', () => {
    expect(
      transcriptCopyRequestReviewSchema.safeParse({ status: 'REJECTED' })
        .success,
    ).toBe(false);
    expect(
      transcriptCopyRequestReviewSchema.safeParse({
        status: 'REJECTED',
        note: 'Incomplete file',
      }).success,
    ).toBe(true);
    expect(
      transcriptCopyRequestReviewSchema.safeParse({ status: 'FULFILLED' })
        .success,
    ).toBe(true);
  });
});

describe('copy request list helpers', () => {
  const pending = {
    id: 'r1',
    status: 'PENDING',
    note: 'Need two copies',
    studentProfileId: 's1',
    StudentProfile: {
      registrationNumber: 'AC-001',
      matriculeNumber: 'MAT-1',
      User: { name: 'Ada Lovelace' },
    },
    RequestedBy: { name: 'Registrar' },
  };

  it('defaults pending filter and searches name, matricule, status, note', () => {
    expect(copyRequestRowMatchesStatusFilter(pending, 'PENDING')).toBe(true);
    expect(copyRequestRowMatchesStatusFilter(pending, 'FULFILLED')).toBe(false);
    expect(copyRequestRowMatchesStatusFilter(pending, 'all')).toBe(true);
    expect(copyRequestMatchesSearch(pending, 'ada')).toBe(true);
    expect(copyRequestMatchesSearch(pending, 'mat-1')).toBe(true);
    expect(copyRequestMatchesSearch(pending, 'two copies')).toBe(true);
    expect(copyRequestMatchesSearch(pending, 'physics')).toBe(false);
  });

  it('uses distinct badges for pending, fulfilled, and rejected', () => {
    expect(copyRequestBadgeVariant('PENDING')).toBe('warning');
    expect(copyRequestBadgeVariant('FULFILLED')).toBe('success');
    expect(copyRequestBadgeVariant('REJECTED')).toBe('destructive');
  });

  it('allows withdrawn and alumni students', () => {
    expect(
      copyRequestStudentStanding({ isActive: false, alumniSince: null }),
    ).toBe('inactive');
    expect(
      copyRequestStudentStanding({
        isActive: true,
        alumniSince: '2025-06-01',
      }),
    ).toBe('alumni');
    expect(copyRequestStudentStanding({ isActive: true })).toBe('active');
  });

  it('optionally limits requests to a student set for the selected year', () => {
    expect(copyRequestMatchesStudentSet('s1', null)).toBe(true);
    expect(copyRequestMatchesStudentSet('s1', new Set(['s1', 's2']))).toBe(
      true,
    );
    expect(copyRequestMatchesStudentSet('s3', new Set(['s1']))).toBe(false);
  });
});

describe('transcript identity and versions', () => {
  it('keys a transcript by student, year, and term', () => {
    expect(
      transcriptIdentityKey({
        studentProfileId: 's1',
        academicYearId: 'y1',
        termId: 't1',
      }),
    ).toBe('s1::y1::t1');
    expect(
      findDuplicateTranscript(
        [
          {
            id: 'tr-1',
            studentProfileId: 's1',
            academicYearId: 'y1',
            termId: 't1',
          },
        ],
        { studentProfileId: 's1', academicYearId: 'y1', termId: 't1' },
      )?.id,
    ).toBe('tr-1');
    expect(
      findDuplicateTranscript(
        [
          {
            id: 'tr-1',
            studentProfileId: 's1',
            academicYearId: 'y1',
            termId: 't1',
          },
        ],
        { studentProfileId: 's1', academicYearId: 'y1', termId: 't1' },
        'tr-1',
      ),
    ).toBeNull();
  });

  it('treats missing or non-ready versions as not issued', () => {
    expect(isIssuedTranscript(null)).toBe(false);
    expect(isIssuedTranscript({ status: 'READY' })).toBe(false);
    expect(
      isIssuedTranscript({ status: 'PENDING', issuedAt: '2026-01-01' }),
    ).toBe(false);
    expect(
      isIssuedTranscript({ status: 'READY', issuedAt: '2026-01-01' }),
    ).toBe(true);
  });

  it('uses distinct version badges', () => {
    expect(transcriptVersionBadgeVariant('READY')).toBe('success');
    expect(transcriptVersionBadgeVariant('FAILED')).toBe('destructive');
    expect(transcriptVersionBadgeVariant('PENDING')).toBe('warning');
    expect(transcriptVersionBadgeVariant(null)).toBe('secondary');
  });

  it('bumps version numbers and allows reissue from READY or FAILED', () => {
    expect(nextTranscriptVersionNumber([])).toBe(1);
    expect(nextTranscriptVersionNumber([{ versionNumber: 2 }])).toBe(3);
    expect(canReissueTranscript('READY')).toBe(true);
    expect(canReissueTranscript('FAILED')).toBe(true);
    expect(canReissueTranscript('PENDING')).toBe(false);
    expect(canReissueTranscript(null)).toBe(false);
    expect(reissueRequiresReason('')).toBe(true);
    expect(reissueRequiresReason('Marks corrected')).toBe(false);
  });

  it('blocks a new READY issue when marks are incomplete unless overridden', () => {
    expect(canIssueReadyTranscript({ marksComplete: false })).toBe(false);
    expect(
      canIssueReadyTranscript({
        marksComplete: false,
        overrideIncompleteMarks: true,
      }),
    ).toBe(true);
    expect(canIssueReadyTranscript({ marksComplete: true })).toBe(true);
  });

  it('filters issued vs not-issued list rows and searches student identity', () => {
    const issued = {
      id: 'tr-1',
      currentVersionId: 'v1',
      StudentProfile: {
        registrationNumber: 'AC-001',
        User: { name: 'Ada Lovelace' },
      },
      TranscriptVersion: { status: 'READY', issuedAt: '2026-03-01' },
    };
    const pending = {
      id: 'tr-2',
      currentVersionId: null,
      StudentProfile: { registrationNumber: 'AC-002', User: { name: 'Alan' } },
    };
    expect(transcriptRowMatchesStatusFilter(issued, 'ready')).toBe(true);
    expect(transcriptRowMatchesStatusFilter(pending, 'ready')).toBe(false);
    expect(transcriptRowMatchesStatusFilter(pending, 'not-issued')).toBe(true);
    expect(transcriptMatchesSearch(issued, 'ada')).toBe(true);
    expect(transcriptMatchesSearch(issued, 'zzz')).toBe(false);
  });
});

describe('transcripts RLS migration', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260820210000_transcripts_edge_cases.sql',
    ),
    'utf8',
  );

  it('adds a unique identity index and scopes transcript SELECTs', () => {
    expect(sql).toMatch(/Transcript_tenant_student_year_term_uidx/);
    expect(sql).toMatch(/TranscriptVersion/);
    expect(sql).toMatch(/Transcript_select_scoped/);
    expect(sql).toMatch(/TranscriptCopyRequest_select_scoped/);
    expect(sql).toMatch(/TranscriptVersion_select_scoped/);
    expect(sql).toMatch(/acadia_is_registry_admin/);
    expect(sql).toMatch(/acadia_is_linked_guardian_of/);
    expect(sql).toMatch(/acadia_teacher_assigned_to_class/);
    expect(sql).toMatch(/acadia_is_admin_or_registrar/);
  });
});
