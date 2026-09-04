-- =============================================================================
-- RESET APP DATA — keep Tenant, roles, and a single admin account
-- =============================================================================
-- Irreversible. Run against Acadia College (mjjulujygiibfndtapud) as postgres.
-- Keeps: Tenant, UserRole, UserPermission, UserRolePermission, admin User/users/auth
-- Removes: all other public rows + non-admin auth users
-- =============================================================================

DO $$
DECLARE
  admin_id text;
  admin_email text;
  admin_name text;
  admin_role_id text;
  admin_tenant_id text;
  admin_status text;
  admin_avatar text;
  admin_is_protected boolean;
  admin_created_at timestamptz;
  admin_updated_at timestamptz;
  admin_uuid uuid;
  r record;
  keep_tables text[] := ARRAY[
    'Tenant',
    'UserRole',
    'UserPermission',
    'UserRolePermission'
  ];
BEGIN
  SELECT
    u.id,
    u.email,
    u.name,
    u."roleId",
    u."tenantId",
    u.status::text,
    u.avatar,
    u."isProtected",
    u."createdAt",
    u."updatedAt"
  INTO
    admin_id,
    admin_email,
    admin_name,
    admin_role_id,
    admin_tenant_id,
    admin_status,
    admin_avatar,
    admin_is_protected,
    admin_created_at,
    admin_updated_at
  FROM "User" u
  LEFT JOIN "UserRole" ur ON ur.id = u."roleId"
  WHERE u."isProtected" = true
     OR lower(u.email) = 'admin@acadia-college.edu'
     OR coalesce(ur.slug, '') IN ('admin', 'super-admin')
  ORDER BY
    CASE WHEN u."isProtected" THEN 0 ELSE 1 END,
    CASE WHEN lower(u.email) = 'admin@acadia-college.edu' THEN 0 ELSE 1 END,
    u."createdAt"
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin account found to preserve.';
  END IF;

  admin_uuid := admin_id::uuid;

  RAISE NOTICE 'Preserving admin % (%)', admin_email, admin_id;

  -- Drop every public table except roles/tenant (CASCADE clears dependents).
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT (c.relname = ANY (keep_tables))
      AND c.relname NOT LIKE 'pg_%'
    ORDER BY c.relname
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
    RAISE NOTICE 'Truncated %', r.tablename;
  END LOOP;

  -- Restore admin profile row.
  INSERT INTO "User" (
    id,
    email,
    name,
    "roleId",
    "tenantId",
    status,
    avatar,
    "isProtected",
    "isTrashed",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    admin_id,
    admin_email,
    coalesce(admin_name, 'Acadia Admin'),
    admin_role_id,
    admin_tenant_id,
    coalesce(admin_status, 'ACTIVE')::"UserStatus",
    admin_avatar,
    coalesce(admin_is_protected, true),
    false,
    coalesce(admin_created_at, NOW()),
    coalesce(admin_updated_at, NOW())
  );

  -- Restore snake_case users mirror if the table exists.
  IF to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      status,
      tenant_id,
      created_at,
      updated_at
    )
    VALUES (
      admin_uuid,
      admin_email,
      coalesce(admin_name, 'Acadia Admin'),
      coalesce(
        (SELECT slug FROM "UserRole" WHERE id = admin_role_id),
        'admin'
      ),
      'active',
      admin_tenant_id,
      coalesce(admin_created_at, NOW()),
      coalesce(admin_updated_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      status = 'active',
      tenant_id = EXCLUDED.tenant_id,
      updated_at = NOW();
  END IF;

  -- Remove every other Auth user (optional tables ignored if absent).
  BEGIN
    DELETE FROM auth.sessions WHERE user_id IS DISTINCT FROM admin_uuid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.identities WHERE user_id IS DISTINCT FROM admin_uuid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.mfa_amr_claims
    WHERE session_id IN (
      SELECT id FROM auth.sessions WHERE user_id IS DISTINCT FROM admin_uuid
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.mfa_factors WHERE user_id IS DISTINCT FROM admin_uuid;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.refresh_tokens WHERE user_id IS DISTINCT FROM admin_uuid::text;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  DELETE FROM auth.users WHERE id IS DISTINCT FROM admin_uuid;

  RAISE NOTICE 'Reset complete. Only admin % remains.', admin_email;
END $$;

-- Verification (counts only)
SELECT 'User' AS tbl, count(*) AS n FROM "User"
UNION ALL SELECT 'users', count(*) FROM public.users
UNION ALL SELECT 'auth.users', count(*) FROM auth.users
UNION ALL SELECT 'Tenant', count(*) FROM "Tenant"
UNION ALL SELECT 'UserRole', count(*) FROM "UserRole"
ORDER BY tbl;
