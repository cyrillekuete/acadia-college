-- Tenant isolation for teachers (admin dashboard teacher metrics).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'teachers'
  ) THEN
    ALTER TABLE public.teachers
      ADD COLUMN IF NOT EXISTS tenant_id text REFERENCES public."Tenant"(id);

    UPDATE public.teachers t
    SET tenant_id = u.tenant_id
    FROM public.users u
    WHERE t.user_id = u.id
      AND t.tenant_id IS NULL;

    UPDATE public.teachers
    SET tenant_id = COALESCE(
      tenant_id,
      (SELECT id FROM public."Tenant" ORDER BY "createdAt" NULLS LAST LIMIT 1)
    )
    WHERE tenant_id IS NULL;

    UPDATE public.teachers
    SET tenant_id = '117b136b-002f-4833-bc31-08f47da658bd'
    WHERE tenant_id IS NULL;

    ALTER TABLE public.teachers
      ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;
