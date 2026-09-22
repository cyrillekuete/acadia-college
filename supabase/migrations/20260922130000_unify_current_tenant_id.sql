-- Session tenant and RLS must agree.
-- App merge prefers legacy "User"."tenantId", then users.tenant_id.
-- This function uses the same order. Backfill copies legacy tenants onto users.

UPDATE public.users AS n
SET tenant_id = u."tenantId"
FROM public."User" AS u
WHERE n.id::text = u.id
  AND u."tenantId" IS NOT NULL
  AND n.tenant_id IS DISTINCT FROM u."tenantId";

CREATE OR REPLACE FUNCTION public.acadia_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT u."tenantId"
      FROM public."User" AS u
      WHERE u.id = auth.uid()::text
        AND u."tenantId" IS NOT NULL
      LIMIT 1
    ),
    (
      SELECT n.tenant_id
      FROM public.users AS n
      WHERE n.id = auth.uid()
        AND n.tenant_id IS NOT NULL
      LIMIT 1
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_tenant_id() TO authenticated;
