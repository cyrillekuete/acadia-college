-- Term-level discipline totals entered by class masters for report cards.

CREATE TABLE IF NOT EXISTS public."StudentTermDiscipline" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "classId" text NOT NULL,
  "studentProfileId" text NOT NULL,
  "termNumber" integer NOT NULL,
  "absenceHours" integer NOT NULL DEFAULT 0,
  suspensions integer NOT NULL DEFAULT 0,
  warnings integer NOT NULL DEFAULT 0,
  "recordedByStaffProfileId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentTermDiscipline_pkey" PRIMARY KEY (id),
  CONSTRAINT "StudentTermDiscipline_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "StudentTermDiscipline_tenant_year_class_student_term_key"
    UNIQUE ("tenantId", "academicYearId", "classId", "studentProfileId", "termNumber"),
  CONSTRAINT "StudentTermDiscipline_termNumber_check"
    CHECK ("termNumber" >= 1 AND "termNumber" <= 3),
  CONSTRAINT "StudentTermDiscipline_absenceHours_check"
    CHECK ("absenceHours" >= 0 AND "absenceHours" <= 999),
  CONSTRAINT "StudentTermDiscipline_suspensions_check"
    CHECK (suspensions >= 0 AND suspensions <= 99),
  CONSTRAINT "StudentTermDiscipline_warnings_check"
    CHECK (warnings >= 0 AND warnings <= 99),
  CONSTRAINT "StudentTermDiscipline_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "StudentTermDiscipline_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE RESTRICT,
  CONSTRAINT "StudentTermDiscipline_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StudentTermDiscipline_studentProfileId_tenantId_fkey"
    FOREIGN KEY ("studentProfileId", "tenantId")
    REFERENCES public."StudentProfile"("id", "tenantId") ON DELETE CASCADE,
  CONSTRAINT "StudentTermDiscipline_recordedBy_tenantId_fkey"
    FOREIGN KEY ("tenantId", "recordedByStaffProfileId")
    REFERENCES public."StaffProfile"("tenantId", id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "StudentTermDiscipline_class_term_idx"
  ON public."StudentTermDiscipline" ("tenantId", "academicYearId", "classId", "termNumber");

CREATE INDEX IF NOT EXISTS "StudentTermDiscipline_student_year_idx"
  ON public."StudentTermDiscipline" ("tenantId", "studentProfileId", "academicYearId");

ALTER TABLE public."StudentTermDiscipline" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "StudentTermDiscipline_select_tenant" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_select_tenant"
  ON public."StudentTermDiscipline"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "StudentTermDiscipline_insert_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_insert_class_master"
  ON public."StudentTermDiscipline"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "classId"
          AND c."tenantId" = "tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
  );

DROP POLICY IF EXISTS "StudentTermDiscipline_update_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_update_class_master"
  ON public."StudentTermDiscipline"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "classId"
          AND c."tenantId" = "tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "classId"
          AND c."tenantId" = "tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
  );

DROP POLICY IF EXISTS "StudentTermDiscipline_delete_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_delete_class_master"
  ON public."StudentTermDiscipline"
  FOR DELETE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_admin_or_registrar()
      OR EXISTS (
        SELECT 1
        FROM public."Class" c
        WHERE c.id = "classId"
          AND c."tenantId" = "tenantId"
          AND c."staffProfileId" = public.acadia_current_staff_profile_id()
      )
    )
  );
