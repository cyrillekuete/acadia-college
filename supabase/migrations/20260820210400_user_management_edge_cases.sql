-- User management edge cases: SystemLog tenant isolation, last-manager
-- lockout, and freeze of protected users' role/status/isTrashed.

ALTER TABLE public."SystemLog"
  ADD COLUMN IF NOT EXISTS "tenantId" text;

UPDATE public."SystemLog" sl
SET "tenantId" = u."tenantId"
FROM public."User" u
WHERE sl."userId" = u.id
  AND sl."tenantId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SystemLog_tenantId_fkey'
  ) THEN
    ALTER TABLE public."SystemLog"
      ADD CONSTRAINT "SystemLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SystemLog_tenantId_createdAt_idx"
  ON public."SystemLog" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SystemLog_entityId_idx"
  ON public."SystemLog" ("entityId");

DROP POLICY IF EXISTS "systemlog_select_tenant" ON public."SystemLog";
CREATE POLICY "systemlog_select_tenant"
  ON public."SystemLog"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_can_manage_users()
      OR "userId" = auth.uid()::text
      OR "entityId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "systemlog_insert" ON public."SystemLog";
CREATE POLICY "systemlog_insert"
  ON public."SystemLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ("userId" = auth.uid()::text OR public.acadia_can_manage_users())
    AND (
      "tenantId" IS NULL
      OR "tenantId" = public.acadia_current_tenant_id()
    )
  );

CREATE OR REPLACE FUNCTION public.acadia_is_active_manager_account(
  role_id text,
  status public."UserStatus",
  is_trashed boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status = 'ACTIVE'::public."UserStatus"
    AND NOT COALESCE(is_trashed, false)
    AND EXISTS (
      SELECT 1
      FROM public."UserRole" r
      WHERE r.id = role_id
        AND lower(r.slug) IN ('admin', 'super-admin', 'registrar')
    );
$$;

GRANT EXECUTE ON FUNCTION public.acadia_is_active_manager_account(text, public."UserStatus", boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.acadia_user_safety_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining integer;
  was_manager boolean;
  will_be_manager boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    was_manager := public.acadia_is_active_manager_account(
      OLD."roleId",
      OLD.status,
      OLD."isTrashed"
    );
    IF was_manager THEN
      SELECT COUNT(*) INTO remaining
      FROM public."User" u
      WHERE u."tenantId" IS NOT DISTINCT FROM OLD."tenantId"
        AND u.id <> OLD.id
        AND public.acadia_is_active_manager_account(u."roleId", u.status, u."isTrashed");
      IF remaining = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last active user manager';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."isProtected" THEN
    IF NEW."roleId" IS DISTINCT FROM OLD."roleId"
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW."isTrashed" IS DISTINCT FROM OLD."isTrashed"
       OR NEW."isProtected" IS DISTINCT FROM OLD."isProtected"
    THEN
      RAISE EXCEPTION 'Protected accounts cannot change role or status';
    END IF;
  END IF;

  was_manager := public.acadia_is_active_manager_account(
    OLD."roleId",
    OLD.status,
    OLD."isTrashed"
  );
  will_be_manager := public.acadia_is_active_manager_account(
    NEW."roleId",
    NEW.status,
    NEW."isTrashed"
  );

  IF was_manager AND NOT will_be_manager THEN
    SELECT COUNT(*) INTO remaining
    FROM public."User" u
    WHERE u."tenantId" IS NOT DISTINCT FROM OLD."tenantId"
      AND u.id <> OLD.id
      AND public.acadia_is_active_manager_account(u."roleId", u.status, u."isTrashed");
    IF remaining = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last active user manager';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_safety_guard_update ON public."User";
CREATE TRIGGER user_safety_guard_update
  BEFORE UPDATE ON public."User"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_user_safety_guard();

DROP TRIGGER IF EXISTS user_safety_guard_delete ON public."User";
CREATE TRIGGER user_safety_guard_delete
  BEFORE DELETE ON public."User"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_user_safety_guard();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_email_key'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX "User_email_key" ON public."User" (email);
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'Skipping User_email_key; duplicate emails exist';
    END;
  END IF;
END $$;
