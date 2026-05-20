/**
 * Wave 7K unit tests
 * Covers: resource inventory, allocations, usage, requests, room utilization
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateResourceUsage,
  aggregateRoomUsage,
  buildLearningMaterialStorageKey,
  canReviewResourceRequest,
  computeAvailableQuantity,
  formatFileSize,
  formatTimetableSlotSummary,
  formatWeeklyHours,
  learningMaterialTitleDisplay,
  resolveAllocationStatus,
  summarizeInventoryResource,
} from '@/lib/acadia/resources';
import {
  learningMaterialSchema,
  resourceAllocationSchema,
  resourceRequestSchema,
  schoolResourceSchema,
} from '@/lib/acadia/resources-schemas';

describe('resolveAllocationStatus', () => {
  it('marks active allocations past expected return as overdue', () => {
    expect(
      resolveAllocationStatus(
        {
          status: 'ACTIVE',
          quantity: 1,
          expectedReturnOn: '2020-01-01',
        },
        '2026-05-19',
      ),
    ).toBe('OVERDUE');
  });

  it('returns returned when returnedAt is set', () => {
    expect(
      resolveAllocationStatus({
        status: 'ACTIVE',
        quantity: 1,
        returnedAt: '2026-01-01',
      }),
    ).toBe('RETURNED');
  });
});

describe('computeAvailableQuantity', () => {
  it('subtracts active allocations from total stock', () => {
    const available = computeAvailableQuantity(10, [
      { status: 'ACTIVE', quantity: 3 },
      { status: 'ACTIVE', quantity: 2 },
      { status: 'RETURNED', quantity: 4 },
    ]);
    expect(available).toBe(5);
  });
});

describe('aggregateResourceUsage', () => {
  it('sums quantities and finds last used date', () => {
    const result = aggregateResourceUsage([
      { quantity: 2, usedOn: '2026-05-01' },
      { quantity: 1, usedOn: '2026-05-10' },
    ]);
    expect(result.totalUses).toBe(3);
    expect(result.lastUsedOn).toBe('2026-05-10');
  });
});

describe('summarizeInventoryResource', () => {
  it('combines allocation and usage metrics', () => {
    const summary = summarizeInventoryResource({
      id: 'r1',
      code: 'LAB-01',
      nameEn: 'Microscope',
      totalQuantity: 5,
      allocations: [{ status: 'ACTIVE', quantity: 2 }],
      usageLogs: [{ quantity: 3, usedOn: '2026-05-01' }],
    });
    expect(summary.allocated).toBe(2);
    expect(summary.available).toBe(3);
    expect(summary.totalUses).toBe(3);
  });
});

describe('canReviewResourceRequest', () => {
  it('allows approve or reject from pending', () => {
    expect(canReviewResourceRequest('PENDING', 'APPROVED')).toBe(true);
    expect(canReviewResourceRequest('PENDING', 'FULFILLED')).toBe(false);
  });

  it('allows fulfill from approved', () => {
    expect(canReviewResourceRequest('APPROVED', 'FULFILLED')).toBe(true);
  });
});

describe('aggregateRoomUsage', () => {
  it('counts slots and weekly minutes per room', () => {
    const map = aggregateRoomUsage([
      {
        id: '1',
        roomId: 'room-a',
        dayOfWeek: 1,
        startMinutes: 480,
        endMinutes: 540,
      },
      {
        id: '2',
        roomId: 'room-a',
        dayOfWeek: 2,
        startMinutes: 600,
        endMinutes: 660,
      },
    ]);
    const stats = map.get('room-a');
    expect(stats?.slotCount).toBe(2);
    expect(stats?.weeklyMinutes).toBe(120);
  });
});

describe('formatWeeklyHours', () => {
  it('converts minutes to hours label', () => {
    expect(formatWeeklyHours(90)).toBe('1.5 h');
  });
});

describe('formatTimetableSlotSummary', () => {
  it('includes day, time, and subject', () => {
    const text = formatTimetableSlotSummary({
      id: 's1',
      dayOfWeek: 1,
      startMinutes: 480,
      endMinutes: 540,
      subjectCode: 'MATH101',
    });
    expect(text).toContain('Monday');
    expect(text).toContain('MATH101');
  });
});

describe('learningMaterialTitleDisplay', () => {
  it('prefers English title', () => {
    expect(
      learningMaterialTitleDisplay({ titleEn: 'Guide', titleFr: 'Guide FR' }),
    ).toBe('Guide');
  });
});

describe('formatFileSize', () => {
  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });
});

describe('buildLearningMaterialStorageKey', () => {
  it('scopes uploads under tenant and material id', () => {
    expect(
      buildLearningMaterialStorageKey('tenant-1', 'lm-1', 'notes.pdf'),
    ).toBe('tenant-1/materials/lm-1/notes.pdf');
  });
});

describe('resource schemas', () => {
  it('validates school resource', () => {
    const parsed = schoolResourceSchema.parse({
      code: 'LAB-01',
      nameEn: 'Microscope',
      nameFr: 'Microscope',
      resourceType: 'LAB',
      totalQuantity: 3,
      isActive: true,
    });
    expect(parsed.code).toBe('LAB-01');
  });

  it('validates resource allocation', () => {
    const parsed = resourceAllocationSchema.parse({
      resourceId: 'res-1',
      allocatedToUserId: 'user-1',
      quantity: 1,
      allocatedOn: '2026-05-19',
    });
    expect(parsed.quantity).toBe(1);
  });

  it('validates resource request', () => {
    const parsed = resourceRequestSchema.parse({
      resourceId: 'res-1',
      quantity: 2,
      purpose: 'Lab session',
    });
    expect(parsed.purpose).toBe('Lab session');
  });

  it('requires URL for link materials', () => {
    expect(() =>
      learningMaterialSchema.parse({
        titleEn: 'Link',
        titleFr: 'Lien',
        kind: 'LINK',
        externalUrl: '',
        isPublished: true,
      }),
    ).toThrow();
  });
});
