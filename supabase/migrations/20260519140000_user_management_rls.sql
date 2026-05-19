-- Wave 7C: User management RLS + SystemLog tenant visibility

CREATE OR REPLACE FUNCTION public.acadia_can_manage_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(public.acadia_current_role_slug()) IN (
    'admin',
    'super-admin',
    'registrar'
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_can_manage_users() TO authenticated;

-- User: administrators may create and update tenant users
DROP POLICY IF EXISTS "user_insert_admin" ON public."User";
CREATE POLICY "user_insert_admin"
  ON public."User"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_manage_users()
  );

DROP POLICY IF EXISTS "user_update_admin" ON public."User";
CREATE POLICY "user_update_admin"
  ON public."User"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_manage_users()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_manage_users()
  );

DROP POLICY IF EXISTS "user_delete_admin" ON public."User";
CREATE POLICY "user_delete_admin"
  ON public."User"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_can_manage_users()
    AND id <> auth.uid()::text
    AND NOT COALESCE("isProtected", false)
  );

-- SystemLog: tenant-scoped reads; actors log their own actions; admins log any
ALTER TABLE public."SystemLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "systemlog_select_tenant" ON public."SystemLog";
CREATE POLICY "systemlog_select_tenant"
  ON public."SystemLog"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = "SystemLog"."userId"
        AND u."tenantId" = public.acadia_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "systemlog_insert" ON public."SystemLog";
CREATE POLICY "systemlog_insert"
  ON public."SystemLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.acadia_can_manage_users()
  );
