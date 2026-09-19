import { describe, expect, it } from 'vitest';
import { STUDENT_CREATE_STEP_FIELDS } from '@/lib/acadia/student-create-schemas';
import { STAFF_CREATE_STEP_FIELDS } from '@/lib/acadia/staff-create-schemas';

function allStepFields(
  map: Record<number, readonly string[]>,
): Set<string> {
  const keys = new Set<string>();
  for (const fields of Object.values(map)) {
    for (const field of fields) {
      keys.add(field);
    }
  }
  return keys;
}

describe('registry create wizard step fields', () => {
  it('covers required student create fields across steps', () => {
    const covered = allStepFields(STUDENT_CREATE_STEP_FIELDS);
    const required = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'phone_country',
      'subsystem',
      'branch',
      'academic_year_id',
      'level_id',
      'parent_name',
      'parent_phone',
      'parent_phone_country',
      'parent_relationship',
    ];
    for (const key of required) {
      expect(covered.has(key), `missing student step mapping for ${key}`).toBe(
        true,
      );
    }
  });

  it('covers required staff create fields across steps', () => {
    const covered = allStepFields(STAFF_CREATE_STEP_FIELDS);
    const required = [
      'title',
      'firstName',
      'lastName',
      'personalEmail',
      'phone',
      'phoneCountry',
      'subSystem',
      'academicYearId',
      'employmentType',
    ];
    for (const key of required) {
      expect(covered.has(key), `missing staff step mapping for ${key}`).toBe(
        true,
      );
    }
  });
});
