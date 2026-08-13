-- Tenant isolation for classes and user_activity_logs (admin dashboard metrics/feed).

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS tenant_id text REFERENCES public."Tenant"(id);

UPDATE public.classes
SET tenant_id = COALESCE(
  tenant_id,
  (SELECT id FROM public."Tenant" ORDER BY "createdAt" NULLS LAST LIMIT 1)
)
WHERE tenant_id IS NULL;

UPDATE public.classes
SET tenant_id = '117b136b-002f-4833-bc31-08f47da658bd'
WHERE tenant_id IS NULL;

ALTER TABLE public.classes
  ALTER COLUMN tenant_id SET NOT NULL;

DROP POLICY IF EXISTS "classes_read_all" ON public.classes;
DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;

CREATE POLICY "classes_tenant_select" ON public.classes
  FOR SELECT TO authenticated
  USING (tenant_id = public.acadia_current_tenant_id());

CREATE POLICY "classes_admin_all" ON public.classes
  FOR ALL TO authenticated
  USING (acadia_is_admin() AND tenant_id = public.acadia_current_tenant_id())
  WITH CHECK (acadia_is_admin() AND tenant_id = public.acadia_current_tenant_id());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_activity_logs'
  ) THEN
    ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "user_activity_logs_tenant_select" ON public.user_activity_logs;
    CREATE POLICY "user_activity_logs_tenant_select" ON public.user_activity_logs
      FOR SELECT TO authenticated
      USING (
        user_id IS NOT NULL
        AND user_id IN (
          SELECT u.id
          FROM public.users u
          WHERE u.tenant_id = public.acadia_current_tenant_id()
        )
      );

    DROP POLICY IF EXISTS "user_activity_logs_tenant_insert" ON public.user_activity_logs;
    CREATE POLICY "user_activity_logs_tenant_insert" ON public.user_activity_logs
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id IS NOT NULL
        AND user_id IN (
          SELECT u.id
          FROM public.users u
          WHERE u.tenant_id = public.acadia_current_tenant_id()
        )
      );
  END IF;
END $$;
