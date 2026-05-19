import type { ResourceRequestReviewValues } from '@/lib/acadia/resources-schemas';
import { dayOfWeekLabel, formatTimeRange } from '@/lib/acadia/timetable';

export const LEARNING_MATERIAL_KINDS = [
  'DOCUMENT',
  'VIDEO',
  'LINK',
  'OTHER',
] as const;

export const SCHOOL_RESOURCE_TYPES = [
  'EQUIPMENT',
  'BOOK',
  'LAB',
  'IT',
  'OTHER',
] as const;

export const RESOURCE_ALLOCATION_STATUSES = [
  'ACTIVE',
  'RETURNED',
  'OVERDUE',
] as const;

export const RESOURCE_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FULFILLED',
  'CANCELLED',
] as const;

export const ROOM_MAINTENANCE_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

const MATERIAL_KIND_LABELS: Record<string, string> = {
  DOCUMENT: 'Document',
  VIDEO: 'Video',
  LINK: 'External link',
  OTHER: 'Other',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipment',
  BOOK: 'Book',
  LAB: 'Lab',
  IT: 'IT',
  OTHER: 'Other',
};

const ALLOCATION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  OVERDUE: 'Overdue',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
};

const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function learningMaterialKindLabel(kind: string): string {
  return MATERIAL_KIND_LABELS[kind] ?? kind;
}

export function schoolResourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type] ?? type;
}

export function resourceAllocationStatusLabel(status: string): string {
  return ALLOCATION_STATUS_LABELS[status] ?? status;
}

export function resourceRequestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function roomMaintenanceStatusLabel(status: string): string {
  return MAINTENANCE_STATUS_LABELS[status] ?? status;
}

export function learningMaterialTitleDisplay(input: {
  titleEn?: string | null;
  titleFr?: string | null;
}): string {
  return input.titleEn?.trim() || input.titleFr?.trim() || 'Untitled material';
}

export type AllocationRow = {
  status: string;
  quantity: number;
  expectedReturnOn?: string | null;
  returnedAt?: string | null;
};

/** Effective allocation status considering return date. */
export function resolveAllocationStatus(
  row: AllocationRow,
  todayIso = new Date().toISOString().slice(0, 10),
): string {
  if (row.status === 'RETURNED' || row.returnedAt) {
    return 'RETURNED';
  }
  if (
    row.status === 'ACTIVE' &&
    row.expectedReturnOn &&
    row.expectedReturnOn < todayIso
  ) {
    return 'OVERDUE';
  }
  return row.status;
}

export function computeAllocatedQuantity(allocations: AllocationRow[]): number {
  return allocations
    .filter((row) => resolveAllocationStatus(row) === 'ACTIVE')
    .reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
}

export function computeAvailableQuantity(
  totalQuantity: number,
  allocations: AllocationRow[],
): number {
  const allocated = computeAllocatedQuantity(allocations);
  return Math.max(0, totalQuantity - allocated);
}

export type UsageLogRow = { quantity: number; usedOn: string };

export function aggregateResourceUsage(logs: UsageLogRow[]): {
  totalUses: number;
  lastUsedOn: string | null;
} {
  if (logs.length === 0) {
    return { totalUses: 0, lastUsedOn: null };
  }
  const totalUses = logs.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const lastUsedOn = logs
    .map((row) => row.usedOn)
    .sort()
    .at(-1) ?? null;
  return { totalUses, lastUsedOn };
}

export type InventoryResourceRow = {
  id: string;
  code: string;
  nameEn: string;
  totalQuantity: number;
  allocations: AllocationRow[];
  usageLogs: UsageLogRow[];
};

export function summarizeInventoryResource(row: InventoryResourceRow) {
  const allocated = computeAllocatedQuantity(row.allocations);
  const available = computeAvailableQuantity(row.totalQuantity, row.allocations);
  const usage = aggregateResourceUsage(row.usageLogs);
  return {
    allocated,
    available,
    ...usage,
  };
}

export function canReviewResourceRequest(
  currentStatus: string,
  nextStatus: ResourceRequestReviewValues['status'],
): boolean {
  if (currentStatus === 'PENDING') {
    return ['APPROVED', 'REJECTED', 'CANCELLED'].includes(nextStatus);
  }
  if (currentStatus === 'APPROVED') {
    return ['FULFILLED', 'CANCELLED'].includes(nextStatus);
  }
  return false;
}

export type TimetableSlotForRoom = {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  courseCode?: string | null;
  courseName?: string | null;
  staffName?: string | null;
};

export function formatTimetableSlotSummary(slot: TimetableSlotForRoom): string {
  const course = slot.courseCode ?? slot.courseName ?? 'Course';
  const time = formatTimeRange(slot.startMinutes, slot.endMinutes);
  return `${dayOfWeekLabel(slot.dayOfWeek)} ${time} — ${course}`;
}

export type RoomUsageSlot = TimetableSlotForRoom & { roomId: string };

export function aggregateRoomUsage(slots: RoomUsageSlot[]): Map<
  string,
  { slotCount: number; weeklyMinutes: number }
> {
  const map = new Map<string, { slotCount: number; weeklyMinutes: number }>();
  for (const slot of slots) {
    const current = map.get(slot.roomId) ?? { slotCount: 0, weeklyMinutes: 0 };
    current.slotCount += 1;
    current.weeklyMinutes += Math.max(0, slot.endMinutes - slot.startMinutes);
    map.set(slot.roomId, current);
  }
  return map;
}

export function formatWeeklyHours(weeklyMinutes: number): string {
  const hours = weeklyMinutes / 60;
  return `${hours.toFixed(1)} h`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildLearningMaterialStorageKey(
  tenantId: string,
  materialId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tenantId}/materials/${materialId}/${safeName}`;
}
