-- Scheme of work: shared topic plan per subject + level + academic year,
-- with per-class coverage progress.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'SchemeOfWorkStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public."SchemeOfWorkStatus" AS ENUM ('DRAFT', 'PUBLISHED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."SchemeOfWork" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "academicYearId" text NOT NULL,
  "subjectId" text NOT NULL,
  "levelId" text NOT NULL,
  status public."SchemeOfWorkStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchemeOfWork_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchemeOfWork_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SchemeOfWork_tenant_year_subject_level_key"
    UNIQUE ("tenantId", "academicYearId", "subjectId", "levelId"),
  CONSTRAINT "SchemeOfWork_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchemeOfWork_academicYearId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "academicYearId")
    REFERENCES public."AcademicYear"("tenantId", id) ON DELETE RESTRICT,
  CONSTRAINT "SchemeOfWork_subjectId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "subjectId")
    REFERENCES public."Subject"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "SchemeOfWork_levelId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "levelId")
    REFERENCES public."Level"("tenantId", id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "SchemeOfWork_tenantId_academicYearId_idx"
  ON public."SchemeOfWork" ("tenantId", "academicYearId");

CREATE INDEX IF NOT EXISTS "SchemeOfWork_tenantId_subjectId_idx"
  ON public."SchemeOfWork" ("tenantId", "subjectId");

CREATE TABLE IF NOT EXISTS public."SchemeOfWorkTopic" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "schemeOfWorkId" text NOT NULL,
  "termId" text NOT NULL,
  "weekNumber" integer NOT NULL,
  "titleEn" text NOT NULL,
  "titleFr" text NOT NULL,
  "descriptionEn" text,
  "descriptionFr" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchemeOfWorkTopic_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchemeOfWorkTopic_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SchemeOfWorkTopic_weekNumber_check"
    CHECK ("weekNumber" >= 1 AND "weekNumber" <= 20),
  CONSTRAINT "SchemeOfWorkTopic_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchemeOfWorkTopic_schemeOfWorkId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "schemeOfWorkId")
    REFERENCES public."SchemeOfWork"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "SchemeOfWorkTopic_termId_tenantId_fkey"
    FOREIGN KEY ("termId", "tenantId")
    REFERENCES public."Term"(id, "tenantId") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "SchemeOfWorkTopic_scheme_term_week_idx"
  ON public."SchemeOfWorkTopic" ("tenantId", "schemeOfWorkId", "termId", "weekNumber", "sortOrder");

CREATE TABLE IF NOT EXISTS public."SchemeOfWorkTopicProgress" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "topicId" text NOT NULL,
  "classId" text NOT NULL,
  "completedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedByStaffProfileId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchemeOfWorkTopicProgress_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchemeOfWorkTopicProgress_tenantId_id_key" UNIQUE ("tenantId", id),
  CONSTRAINT "SchemeOfWorkTopicProgress_tenant_topic_class_key"
    UNIQUE ("tenantId", "topicId", "classId"),
  CONSTRAINT "SchemeOfWorkTopicProgress_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchemeOfWorkTopicProgress_topicId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "topicId")
    REFERENCES public."SchemeOfWorkTopic"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "SchemeOfWorkTopicProgress_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id) ON DELETE CASCADE,
  CONSTRAINT "SchemeOfWorkTopicProgress_completedBy_tenantId_fkey"
    FOREIGN KEY ("tenantId", "completedByStaffProfileId")
    REFERENCES public."StaffProfile"("tenantId", id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "SchemeOfWorkTopicProgress_classId_idx"
  ON public."SchemeOfWorkTopicProgress" ("tenantId", "classId");

CREATE INDEX IF NOT EXISTS "SchemeOfWorkTopicProgress_topicId_idx"
  ON public."SchemeOfWorkTopicProgress" ("tenantId", "topicId");

ALTER TABLE public."SchemeOfWork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchemeOfWorkTopic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchemeOfWorkTopicProgress" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SchemeOfWork_select_tenant" ON public."SchemeOfWork";
CREATE POLICY "SchemeOfWork_select_tenant" ON public."SchemeOfWork"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SchemeOfWork_insert_admin" ON public."SchemeOfWork";
CREATE POLICY "SchemeOfWork_insert_admin" ON public."SchemeOfWork"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWork_update_admin" ON public."SchemeOfWork";
CREATE POLICY "SchemeOfWork_update_admin" ON public."SchemeOfWork"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWork_delete_admin" ON public."SchemeOfWork";
CREATE POLICY "SchemeOfWork_delete_admin" ON public."SchemeOfWork"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopic_select_tenant" ON public."SchemeOfWorkTopic";
CREATE POLICY "SchemeOfWorkTopic_select_tenant" ON public."SchemeOfWorkTopic"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SchemeOfWorkTopic_insert_admin" ON public."SchemeOfWorkTopic";
CREATE POLICY "SchemeOfWorkTopic_insert_admin" ON public."SchemeOfWorkTopic"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopic_update_admin" ON public."SchemeOfWorkTopic";
CREATE POLICY "SchemeOfWorkTopic_update_admin" ON public."SchemeOfWorkTopic"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopic_delete_admin" ON public."SchemeOfWorkTopic";
CREATE POLICY "SchemeOfWorkTopic_delete_admin" ON public."SchemeOfWorkTopic"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_admin_or_registrar()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_select_tenant" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_select_tenant" ON public."SchemeOfWorkTopicProgress"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_insert_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_insert_staff" ON public."SchemeOfWorkTopicProgress"
  FOR INSERT TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_update_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_update_staff" ON public."SchemeOfWorkTopicProgress"
  FOR UPDATE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

DROP POLICY IF EXISTS "SchemeOfWorkTopicProgress_delete_staff" ON public."SchemeOfWorkTopicProgress";
CREATE POLICY "SchemeOfWorkTopicProgress_delete_staff" ON public."SchemeOfWorkTopicProgress"
  FOR DELETE TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );
