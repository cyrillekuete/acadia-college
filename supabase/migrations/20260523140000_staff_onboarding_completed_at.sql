-- Teacher first-login onboarding: staff self-service profile completion.

ALTER TABLE public."StaffProfile"
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" timestamp without time zone;

CREATE OR REPLACE FUNCTION public.acadia_current_staff_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id
  FROM public."StaffProfile" sp
  WHERE sp."userId" = auth.uid()::text
    AND sp."tenantId" = public.acadia_current_tenant_id()
  ORDER BY sp."createdAt" DESC, sp.id ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_staff_profile_id() TO authenticated;

-- Staff may update their own profile (onboarding / self-service).
DROP POLICY IF EXISTS "StaffProfile_update_self" ON public."StaffProfile";
CREATE POLICY "StaffProfile_update_self"
  ON public."StaffProfile"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );

-- Existing staff were provisioned before this gate; do not force them through onboarding.
UPDATE public."StaffProfile"
SET "onboardingCompletedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "onboardingCompletedAt" IS NULL;
