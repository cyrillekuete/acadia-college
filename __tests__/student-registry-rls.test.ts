import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readMigration(name: string): string {
  return readFileSync(
    join(process.cwd(), 'supabase', 'migrations', name),
    'utf8',
  );
}

describe('student registry uniqueness migration', () => {
  const sql = readMigration('20260820120000_student_profile_uniqueness.sql');

  it('adds unique indexes for registration number, matricule, and user', () => {
    expect(sql).toMatch(/StudentProfile_tenant_registration_uidx/);
    expect(sql).toMatch(/StudentProfile_tenant_matricule_uidx/);
    expect(sql).toMatch(/StudentProfile_tenant_user_uidx/);
  });
});

describe('student class migrate RPC', () => {
  const sql = readMigration('20260820130000_migrate_student_class_rpc.sql');

  it('updates profile and enrollment in one function', () => {
    expect(sql).toMatch(/acadia_migrate_student_class/);
    expect(sql).toMatch(/UPDATE public\."StudentProfile"/);
    expect(sql).toMatch(/UPDATE public\."StudentEnrollment"/);
    expect(sql).toMatch(/acadia_is_registry_writer/);
  });
});

describe('student registry SELECT RLS', () => {
  const sql = readMigration('20260820140000_student_registry_select_rls.sql');

  it('scopes StudentProfile and StudentEnrollment reads by role', () => {
    expect(sql).toMatch(/acadia_is_registry_admin/);
    expect(sql).toMatch(/acadia_is_linked_guardian_of/);
    expect(sql).toMatch(/acadia_teacher_assigned_to_class/);
    expect(sql).toMatch(/StaffClassSubjectAssignment/);
    expect(sql).toMatch(/StaffClassAssignment/);
    expect(sql).toMatch(/StudentProfile_select_scoped/);
    expect(sql).toMatch(/StudentEnrollment_select_scoped/);
    expect(sql).toMatch(/bursar/);
  });
});
