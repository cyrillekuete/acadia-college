-- Attendance edge cases: class-scoped sessions, uniqueness, scoped SELECT RLS.

-- 1) classId on AttendanceSession (nullable for legacy rows)
ALTER TABLE public."AttendanceSession"
  ADD COLUMN IF NOT EXISTS "classId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AttendanceSession_classId_tenantId_fkey'
  ) THEN
    ALTER TABLE public."AttendanceSession"
      ADD CONSTRAINT "AttendanceSession_classId_tenantId_fkey"
      FOREIGN KEY ("tenantId", "classId")
      REFERENCES public."Class"("tenantId", id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AttendanceSession_classId_idx"
  ON public."AttendanceSession" ("tenantId", "classId");

-- Backfill when exactly one ClassSubject offers the subject
UPDATE public."AttendanceSession" s
SET "classId" = sub."classId"
FROM (
  SELECT
    cs."tenantId",
    cs."subjectId",
    MIN(cs."classId") AS "classId"
  FROM public."ClassSubject" cs
  GROUP BY cs."tenantId", cs."subjectId"
  HAVING COUNT(*) = 1
) sub
WHERE s."classId" IS NULL
  AND s."tenantId" = sub."tenantId"
  AND s."subjectId" = sub."subjectId";

-- Prefer a UNIQUE CONSTRAINT so PostgREST upsert onConflict works reliably.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."AttendanceRecord"
    GROUP BY "tenantId", "attendanceSessionId", "studentProfileId"
    HAVING COUNT(*) > 1
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'AttendanceRecord_session_student_key'
    ) THEN
      ALTER TABLE public."AttendanceRecord"
        ADD CONSTRAINT "AttendanceRecord_session_student_key"
        UNIQUE ("tenantId", "attendanceSessionId", "studentProfileId");
    END IF;
  END IF;
END $$;

-- 3) One session per class + subject + date (when class is set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."AttendanceSession"
    WHERE "classId" IS NOT NULL
    GROUP BY "tenantId", "academicYearId", "classId", "subjectId", "sessionDate"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceSession_class_subject_date_uidx"
      ON public."AttendanceSession" (
        "tenantId",
        "academicYearId",
        "classId",
        "subjectId",
        "sessionDate"
      )
      WHERE "classId" IS NOT NULL;
  END IF;
END $$;

-- 4) Scoped SELECT policies (replace tenant-wide read)
DROP POLICY IF EXISTS "AttendanceSession_select_tenant" ON public."AttendanceSession";
DROP POLICY IF EXISTS "AttendanceSession_select_scoped" ON public."AttendanceSession";
CREATE POLICY "AttendanceSession_select_scoped"
  ON public."AttendanceSession"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR (
        public.acadia_is_staff_or_teacher()
        AND (
          "classId" IS NULL
          OR public.acadia_teacher_assigned_to_class("classId", "academicYearId")
        )
      )
      OR (
        public.acadia_current_student_profile_id() IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public."AttendanceRecord" r
          WHERE r."tenantId" = "AttendanceSession"."tenantId"
            AND r."attendanceSessionId" = "AttendanceSession".id
            AND r."studentProfileId" = public.acadia_current_student_profile_id()
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public."AttendanceRecord" r
        WHERE r."tenantId" = "AttendanceSession"."tenantId"
          AND r."attendanceSessionId" = "AttendanceSession".id
          AND public.acadia_is_linked_guardian_of(r."studentProfileId")
      )
    )
  );

DROP POLICY IF EXISTS "AttendanceRecord_select_tenant" ON public."AttendanceRecord";
DROP POLICY IF EXISTS "AttendanceRecord_select_scoped" ON public."AttendanceRecord";
CREATE POLICY "AttendanceRecord_select_scoped"
  ON public."AttendanceRecord"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_registry_admin()
      OR (
        public.acadia_is_staff_or_teacher()
        AND EXISTS (
          SELECT 1
          FROM public."AttendanceSession" s
          WHERE s.id = "AttendanceRecord"."attendanceSessionId"
            AND s."tenantId" = "AttendanceRecord"."tenantId"
            AND (
              s."classId" IS NULL
              OR public.acadia_teacher_assigned_to_class(s."classId", s."academicYearId")
            )
        )
      )
      OR "studentProfileId" = public.acadia_current_student_profile_id()
      OR public.acadia_is_linked_guardian_of("studentProfileId")
    )
  );
