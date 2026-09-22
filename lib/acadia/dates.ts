import { z } from 'zod';

/** Manual date-of-birth entry format (DD-MM-YYYY). */
export const DOB_INPUT_PATTERN = /^\d{2}-\d{2}-\d{4}$/;

function parseDobCalendar(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!DOB_INPUT_PATTERN.test(trimmed)) {
    return undefined;
  }
  const [dayStr, monthStr, yearStr] = trimmed.split('-');
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function isCalendarDateAfterToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/** Parse DD-MM-YYYY; rejects empty, invalid, and future dates. */
export function parseDobInput(
  value: string | null | undefined,
): Date | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const date = parseDobCalendar(value);
  if (!date || isCalendarDateAfterToday(date)) {
    return undefined;
  }
  return date;
}

/** DD-MM-YYYY → YYYY-MM-DD for Postgres `date` columns. */
export function dobInputToIsoDate(value: string): string | undefined {
  const date = parseDobCalendar(value);
  if (!date) {
    return undefined;
  }
  return formatLocalDateInputValue(date);
}

/** DB/API YYYY-MM-DD (or ISO date prefix) → DD-MM-YYYY for form prefill. */
export function formatDobInputFromIso(
  value: string | null | undefined,
): string {
  const parsed = parseLocalDateInputValue(value?.trim().slice(0, 10));
  if (!parsed) {
    return '';
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${day}-${month}-${year}`;
}

/** Strip non-digits and insert dashes while typing (max DD-MM-YYYY). */
export function formatDobWhileTyping(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** Optional DOB: empty allowed; valid input transformed to YYYY-MM-DD. */
export function optionalDobField() {
  return z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => val?.trim() ?? '')
    .pipe(
      z
        .string()
        .superRefine((val, ctx) => {
          if (!val) {
            return;
          }
          if (!DOB_INPUT_PATTERN.test(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.invalidDateOfBirth',
            });
            return;
          }
          const date = parseDobCalendar(val);
          if (!date) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.invalidDateOfBirth',
            });
            return;
          }
          if (isCalendarDateAfterToday(date)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'validation.dateOfBirthFuture',
            });
          }
        })
        .transform((val) => (val ? val : undefined)),
    );
}

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
