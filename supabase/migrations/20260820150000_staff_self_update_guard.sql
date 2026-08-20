-- Prefer active StaffProfile for RLS helpers; guard staff self-updates to onboarding columns.

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
  ORDER BY
    CASE WHEN sp."isActive" THEN 0 ELSE 1 END,
    sp."createdAt" DESC,
    sp.id ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_current_staff_profile_id() TO authenticated;

-- Columns staff may change via StaffProfile_update_self (onboarding / contact).
-- Admins/registrars bypass this guard via acadia_is_admin_or_registrar().
CREATE OR REPLACE FUNCTION public.acadia_staff_profile_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.acadia_is_admin_or_registrar() THEN
    RETURN NEW;
  END IF;

  IF OLD."userId" IS DISTINCT FROM auth.uid()::text
     OR NEW."userId" IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Staff may only update their own profile';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
     OR NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."staffCode" IS DISTINCT FROM OLD."staffCode"
     OR NEW."isActive" IS DISTINCT FROM OLD."isActive"
     OR NEW."monthlySalary" IS DISTINCT FROM OLD."monthlySalary"
     OR NEW."employmentType" IS DISTINCT FROM OLD."employmentType"
     OR NEW."departmentId" IS DISTINCT FROM OLD."departmentId"
     OR NEW."hireDate" IS DISTINCT FROM OLD."hireDate"
     OR NEW."subSystem" IS DISTINCT FROM OLD."subSystem"
     OR NEW."dateOfBirth" IS DISTINCT FROM OLD."dateOfBirth"
     OR NEW."gender" IS DISTINCT FROM OLD."gender"
     OR NEW."nationality" IS DISTINCT FROM OLD."nationality"
     OR NEW."idNumber" IS DISTINCT FROM OLD."idNumber"
     OR NEW."address" IS DISTINCT FROM OLD."address"
     OR NEW."city" IS DISTINCT FROM OLD."city"
     OR NEW."region" IS DISTINCT FROM OLD."region"
     OR NEW."qualifications" IS DISTINCT FROM OLD."qualifications"
     OR NEW."teachingExperience" IS DISTINCT FROM OLD."teachingExperience"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
  THEN
    RAISE EXCEPTION 'Staff self-update may only change onboarding contact fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_profile_self_update_guard ON public."StaffProfile";
CREATE TRIGGER staff_profile_self_update_guard
  BEFORE UPDATE ON public."StaffProfile"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_staff_profile_self_update_guard();
