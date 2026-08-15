-- Class-specific teacher ↔ subject assignments (year-scoped).

CREATE TABLE IF NOT EXISTS public."StaffClassSubjectAssignment" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "staffProfileId" text NOT NULL,
  "classId" text NOT NULL,
  "subjectId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffClassSubjectAssignment_pkey" PRIMARY KEY (id),
  CONSTRAINT "StaffClassSubjectAssignment_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "StaffClassSubjectAssignment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "StaffClassSubjectAssignment_staffProfileId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "staffProfileId")
    REFERENCES public."StaffProfile"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassSubjectAssignment_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassSubjectAssignment_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId")
    REFERENCES public."Subject"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassSubjectAssignment_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "StaffClassSubjectAssignment_classSubject_fkey"
    FOREIGN KEY ("tenantId", "classId", "subjectId")
    REFERENCES public."ClassSubject"("tenantId", "classId", "subjectId")
    ON DELETE CASCADE,
  CONSTRAINT "StaffClassSubjectAssignment_tenant_staff_class_subject_year_key"
    UNIQUE ("tenantId", "staffProfileId", "classId", "subjectId", "academicYearId")
);

CREATE INDEX IF NOT EXISTS "StaffClassSubjectAssignment_staffProfileId_idx"
  ON public."StaffClassSubjectAssignment" ("tenantId", "staffProfileId");

CREATE INDEX IF NOT EXISTS "StaffClassSubjectAssignment_classId_idx"
  ON public."StaffClassSubjectAssignment" ("tenantId", "classId");

CREATE INDEX IF NOT EXISTS "StaffClassSubjectAssignment_academicYearId_idx"
  ON public."StaffClassSubjectAssignment" ("tenantId", "academicYearId");

ALTER TABLE public."StaffClassSubjectAssignment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "StaffClassSubjectAssignment_select_tenant"
  ON public."StaffClassSubjectAssignment";
CREATE POLICY "StaffClassSubjectAssignment_select_tenant"
  ON public."StaffClassSubjectAssignment"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "StaffClassSubjectAssignment_insert_admin"
  ON public."StaffClassSubjectAssignment";
CREATE POLICY "StaffClassSubjectAssignment_insert_admin"
  ON public."StaffClassSubjectAssignment"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StaffClassSubjectAssignment_update_admin"
  ON public."StaffClassSubjectAssignment";
CREATE POLICY "StaffClassSubjectAssignment_update_admin"
  ON public."StaffClassSubjectAssignment"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "StaffClassSubjectAssignment_delete_admin"
  ON public."StaffClassSubjectAssignment";
CREATE POLICY "StaffClassSubjectAssignment_delete_admin"
  ON public."StaffClassSubjectAssignment"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

INSERT INTO public."StaffClassSubjectAssignment" (
  id,
  "tenantId",
  "staffProfileId",
  "classId",
  "subjectId",
  "academicYearId",
  "createdAt"
)
SELECT
  'scsa-' || substr(md5(sca.id || sa.id || cs.id), 1, 12),
  sca."tenantId",
  sca."staffProfileId",
  sca."classId",
  sa."subjectId",
  sca."academicYearId",
  CURRENT_TIMESTAMP
FROM public."StaffClassAssignment" sca
JOIN public."SubjectAssignment" sa
  ON sa."staffProfileId" = sca."staffProfileId"
 AND sa."academicYearId" = sca."academicYearId"
 AND sa."tenantId" = sca."tenantId"
JOIN public."ClassSubject" cs
  ON cs."classId" = sca."classId"
 AND cs."subjectId" = sa."subjectId"
 AND cs."tenantId" = sca."tenantId"
ON CONFLICT ("tenantId", "staffProfileId", "classId", "subjectId", "academicYearId")
DO NOTHING;
