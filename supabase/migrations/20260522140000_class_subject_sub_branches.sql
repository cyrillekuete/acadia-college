-- Per-class sub-branch selections (partial subject assignment).

CREATE TABLE IF NOT EXISTS public."ClassSubjectSubBranch" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "classId" text NOT NULL,
  "subjectId" text NOT NULL,
  "subjectSubBranchId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassSubjectSubBranch_pkey" PRIMARY KEY (id),
  CONSTRAINT "ClassSubjectSubBranch_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "ClassSubjectSubBranch_tenantId_classId_subjectSubBranchId_key"
    UNIQUE ("tenantId", "classId", "subjectSubBranchId"),
  CONSTRAINT "ClassSubjectSubBranch_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "ClassSubjectSubBranch_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId") REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ClassSubjectSubBranch_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId") REFERENCES public."Subject"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "ClassSubjectSubBranch_subjectSubBranchId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectSubBranchId") REFERENCES public."SubjectSubBranch"("tenantId", id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClassSubjectSubBranch_tenantId_classId_idx"
  ON public."ClassSubjectSubBranch" ("tenantId", "classId");

CREATE INDEX IF NOT EXISTS "ClassSubjectSubBranch_tenantId_subjectId_idx"
  ON public."ClassSubjectSubBranch" ("tenantId", "subjectId");

ALTER TABLE public."ClassSubjectSubBranch" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ClassSubjectSubBranch_select_tenant" ON public."ClassSubjectSubBranch";
CREATE POLICY "ClassSubjectSubBranch_select_tenant"
  ON public."ClassSubjectSubBranch"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "ClassSubjectSubBranch_insert_admin" ON public."ClassSubjectSubBranch";
CREATE POLICY "ClassSubjectSubBranch_insert_admin"
  ON public."ClassSubjectSubBranch"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "ClassSubjectSubBranch_update_admin" ON public."ClassSubjectSubBranch";
CREATE POLICY "ClassSubjectSubBranch_update_admin"
  ON public."ClassSubjectSubBranch"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());

DROP POLICY IF EXISTS "ClassSubjectSubBranch_delete_admin" ON public."ClassSubjectSubBranch";
CREATE POLICY "ClassSubjectSubBranch_delete_admin"
  ON public."ClassSubjectSubBranch"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar());
