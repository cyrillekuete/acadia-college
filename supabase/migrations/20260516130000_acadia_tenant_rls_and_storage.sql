-- Acadia College: tenant-scoped RLS helpers + Tenant/UserRole policies + tenant-assets bucket

CREATE OR REPLACE FUNCTION public.acadia_current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "tenantId"
  FROM public."User"
  WHERE id = auth.uid()::text
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_tenant_id() TO authenticated;

-- Tenant: members may read their own tenant row
ALTER TABLE public."Tenant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own" ON public."Tenant";
CREATE POLICY "tenant_select_own"
  ON public."Tenant"
  FOR SELECT
  TO authenticated
  USING (id = public.acadia_current_tenant_id());

-- User: tenant-scoped reads
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_select_tenant" ON public."User";
CREATE POLICY "user_select_tenant"
  ON public."User"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

-- UserRole: global role catalog (no tenantId on table)
ALTER TABLE public."UserRole" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "userrole_select_authenticated" ON public."UserRole";
CREATE POLICY "userrole_select_authenticated"
  ON public."UserRole"
  FOR SELECT
  TO authenticated
  USING (true);

-- Tenant branding assets (public read; authenticated upload under tenant folder)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
CREATE POLICY "tenant_assets_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'tenant-assets');

DROP POLICY IF EXISTS "tenant_assets_authenticated_insert" ON storage.objects;
CREATE POLICY "tenant_assets_authenticated_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_assets_authenticated_update" ON storage.objects;
CREATE POLICY "tenant_assets_authenticated_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_assets_authenticated_delete" ON storage.objects;
CREATE POLICY "tenant_assets_authenticated_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-assets'
    AND (storage.foldername(name))[1] = public.acadia_current_tenant_id()
  );
