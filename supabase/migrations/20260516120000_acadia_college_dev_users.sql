-- Dev users for Acadia College (password: Acadia2026!)
-- Links auth.users.id to public.User.id for role-based dashboards.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "Tenant"
SET slug = 'acadia-college', "displayNameEn" = 'Acadia College', "displayNameFr" = 'Collège Acadia', status = 'ACTIVE', "updatedAt" = NOW()
WHERE id = '117b136b-002f-4833-bc31-08f47da658bd';

DO $$
DECLARE
  tenant_id text := '117b136b-002f-4833-bc31-08f47da658bd';
  admin_id uuid := 'a0000001-0001-4000-8000-000000000001';
  staff_id uuid := 'a0000001-0001-4000-8000-000000000002';
  student_id uuid := 'a0000001-0001-4000-8000-000000000003';
  admin_role text := 'ea99228f-9112-4d53-b118-31f736b481ef';
  staff_role text := 'cab4d3e0-02be-4a8c-aaad-bf3491d71713';
  student_role text := '4e7a321c-050e-4ed5-abec-a91616c133c6';
  pwd text := crypt('Acadia2026!', gen_salt('bf'));
BEGIN
  DELETE FROM auth.identities WHERE user_id IN (admin_id, staff_id, student_id);
  DELETE FROM auth.users WHERE id IN (admin_id, staff_id, student_id);
  DELETE FROM "User" WHERE id IN (admin_id::text, staff_id::text, student_id::text);

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin@acadia-college.edu', pwd, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Acadia Admin"}', NOW(), NOW());
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (admin_id, admin_id, admin_id::text, 'email', jsonb_build_object('sub', admin_id::text, 'email', 'admin@acadia-college.edu'), NOW(), NOW(), NOW());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', staff_id, 'authenticated', 'authenticated', 'staff@acadia-college.edu', pwd, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Acadia Staff"}', NOW(), NOW());
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (staff_id, staff_id, staff_id::text, 'email', jsonb_build_object('sub', staff_id::text, 'email', 'staff@acadia-college.edu'), NOW(), NOW(), NOW());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', student_id, 'authenticated', 'authenticated', 'student@acadia-college.edu', pwd, NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Acadia Student"}', NOW(), NOW());
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (student_id, student_id, student_id::text, 'email', jsonb_build_object('sub', student_id::text, 'email', 'student@acadia-college.edu'), NOW(), NOW(), NOW());

  INSERT INTO "User" (id, email, name, "roleId", "tenantId", status, "updatedAt")
  VALUES
    (admin_id::text, 'admin@acadia-college.edu', 'Acadia Admin', admin_role, tenant_id, 'ACTIVE', NOW()),
    (staff_id::text, 'staff@acadia-college.edu', 'Acadia Staff', staff_role, tenant_id, 'ACTIVE', NOW()),
    (student_id::text, 'student@acadia-college.edu', 'Acadia Student', student_role, tenant_id, 'ACTIVE', NOW());
END $$;
