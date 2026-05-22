-- Extended teacher HR fields on StaffProfile + class teaching assignments.

ALTER TABLE public."StaffProfile"
  ADD COLUMN IF NOT EXISTS "firstName" text,
  ADD COLUMN IF NOT EXISTS "lastName" text,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS "idNumber" text,
  ADD COLUMN IF NOT EXISTS "personalEmail" text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS qualifications text,
  ADD COLUMN IF NOT EXISTS "teachingExperience" text,
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS "monthlySalary" numeric,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" text,
  ADD COLUMN IF NOT EXISTS "emergencyContactRelationship" text,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" text;

CREATE TABLE IF NOT EXISTS public."StaffClassAssignment" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "staffProfileId" text NOT NULL,
  "classId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffClassAssignment_pkey" PRIMARY KEY (id),
  CONSTRAINT "StaffClassAssignment_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "StaffClassAssignment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "StaffClassAssignment_staffProfileId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "staffProfileId")
    REFERENCES public."StaffProfile"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassAssignment_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassAssignment_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassAssignment_tenant_staff_class_year_key"
    UNIQUE ("tenantId", "staffProfileId", "classId", "academicYearId")
);

CREATE INDEX IF NOT EXISTS "StaffClassAssignment_staffProfileId_idx"
  ON public."StaffClassAssignment" ("tenantId", "staffProfileId");

CREATE INDEX IF NOT EXISTS "StaffClassAssignment_classId_idx"
  ON public."StaffClassAssignment" ("tenantId", "classId");

ALTER TABLE public."StaffClassAssignment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "StaffClassAssignment_select_tenant" ON public."StaffClassAssignment";
CREATE POLICY "StaffClassAssignment_select_tenant" ON public."StaffClassAssignment"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "StaffClassAssignment_insert_admin" ON public."StaffClassAssignment";
CREATE POLICY "StaffClassAssignment_insert_admin" ON public."StaffClassAssignment"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StaffClassAssignment_update_admin" ON public."StaffClassAssignment";
CREATE POLICY "StaffClassAssignment_update_admin" ON public."StaffClassAssignment"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StaffClassAssignment_delete_admin" ON public."StaffClassAssignment";
CREATE POLICY "StaffClassAssignment_delete_admin" ON public."StaffClassAssignment"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );
