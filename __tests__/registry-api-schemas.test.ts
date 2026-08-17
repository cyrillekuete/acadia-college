import { describe, it, expect } from 'vitest';
import { studentCreateSchema } from '@/lib/acadia/student-create-schemas';

describe('registry API input schemas', () => {
  it('student create requires catalog placement fields', () => {
    const result = studentCreateSchema.safeParse({
      first_name: 'A',
      last_name: 'B',
      email: 'a@school.test',
      is_new_student: true,
      parent_name: 'Parent',
      parent_phone: '677000000',
      parent_relationship: 'father',
    });
    expect(result.success).toBe(false);
  });
});
