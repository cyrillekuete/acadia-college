-- Seed dev accounts into new public.users table.
-- These mirror the rows already seeded into auth.users + public."User"
-- via migration 20260516120000_acadia_college_dev_users.sql.
-- Passwords stay in Supabase Auth; password_hash is NULL here.

DO $$
DECLARE
  tenant_id text := '117b136b-002f-4833-bc31-08f47da658bd';
  admin_id  uuid := 'a0000001-0001-4000-8000-000000000001';
  staff_id  uuid := 'a0000001-0001-4000-8000-000000000002';
  student_id_val uuid := 'a0000001-0001-4000-8000-000000000003';
BEGIN
  INSERT INTO public.users (id, email, name, role, status, tenant_id, created_at, updated_at)
  VALUES
    (admin_id,      'admin@acadia-college.edu',   'Acadia Admin',   'admin',   'active', tenant_id, now(), now()),
    (staff_id,      'staff@acadia-college.edu',   'Acadia Staff',   'teacher', 'active', tenant_id, now(), now()),
    (student_id_val,'student@acadia-college.edu', 'Acadia Student', 'student', 'active', tenant_id, now(), now())
  ON CONFLICT (id) DO NOTHING;
END $$;
