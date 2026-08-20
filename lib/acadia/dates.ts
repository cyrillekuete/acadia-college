/**
 * Formats a Date as YYYY-MM-DD in the local timezone (for `<input type="date">`).
 */
export function formatLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Display a YYYY-MM-DD value without UTC midnight timezone skew. */
export function formatDateOnlyDisplay(value: string | null | undefined): string {
  const parsed = parseLocalDateInputValue(value?.trim().slice(0, 10));
  if (!parsed) {
    return '—';
  }
  return parsed.toLocaleDateString();
}

/** Parse YYYY-MM-DD from form state to a local Date (for calendar pickers). */
export function parseLocalDateInputValue(
  value: string | null | undefined,
): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const DATETIME_LOCAL_INPUT_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Converts `<input type="datetime-local">` value (local wall time, no offset) to UTC ISO.
 * Avoids parsing the string as UTC in some runtimes via `new Date(isoWithoutZ)`.
 */
export function localDateTimeInputToIso(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  const match = value.trim().match(DATETIME_LOCAL_INPUT_RE);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Formats an ISO / DB timestamp for `<input type="datetime-local">` in local time.
 */
export function isoToLocalDateTimeInputValue(
  iso: string | null | undefined,
): string {
  if (!iso?.trim()) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
