-- =============================================================================
-- CLEAR LEVELS & CLASSES (tenant-scoped, destructive)
-- =============================================================================
--
-- PURPOSE
--   Remove all Level and Class structure for one tenant so you can recreate
--   levels/classes manually in the app (/academics/levels, /academics/classes).
--
-- WARNING
--   Irreversible for this tenant. Also deletes rows that FK-block Level/Class:
--   subjects, subject offerings, class links, enrollments, applications,
--   promotion decisions, and student profiles (and their fee/transcript rows).
--   Auth User accounts are NOT deleted.
--
-- HOW TO RUN
--   1. Supabase Dashboard → SQL Editor (or psql as postgres / service_role).
--   2. Set v_tenant below to your tenant id (default: acadia-college-default).
--   3. Run the PREVIEW block first and review counts.
--   4. Run the main DO block. For a dry run, wrap the body in
--      BEGIN … ROLLBACK instead of relying on implicit commit (see note at end).
--
-- AFTER RUNNING
--   SELECT count(*) FROM "Level"   WHERE "tenantId" = 'acadia-college-default';
--   SELECT count(*) FROM "Class"   WHERE "tenantId" = 'acadia-college-default';
--   Both should be 0. Then create levels/classes in the app.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREVIEW: row counts per table (safe to run alone in SQL Editor)
-- -----------------------------------------------------------------------------
-- >>> Change this literal in PREVIEW and in the DO block below <<<
WITH cfg AS (SELECT 'acadia-college-default'::text AS tenant_id)
SELECT 'ClassPromotionPolicy' AS tbl, count(*) AS n
FROM "ClassPromotionPolicy", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'StudentPromotionDecision', count(*)
FROM "StudentPromotionDecision", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'ClassSubject', count(*) FROM "ClassSubject", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'StudentEnrollment', count(*) FROM "StudentEnrollment", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'EnrollmentApplication', count(*) FROM "EnrollmentApplication", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'Class', count(*) FROM "Class", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'Level', count(*) FROM "Level", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'Subject', count(*) FROM "Subject", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'SubjectStreamOffering', count(*) FROM "SubjectStreamOffering", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'StudentProfile', count(*) FROM "StudentProfile", cfg WHERE "tenantId" = cfg.tenant_id
UNION ALL
SELECT 'classes (legacy)', count(*) FROM public.classes c, cfg WHERE c.tenant_id = cfg.tenant_id
ORDER BY tbl;

-- -----------------------------------------------------------------------------
-- DELETE (transaction + per-step notices)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_tenant text := 'acadia-college-default';
  v_rows bigint;
BEGIN
  IF v_tenant IS NULL OR length(trim(v_tenant)) = 0 THEN
    RAISE EXCEPTION 'Set v_tenant to your tenant id before running.';
  END IF;

  RAISE NOTICE '=== Clearing levels/classes for tenant: % ===', v_tenant;

  -- Phase A: class / level operational data
  DELETE FROM "ClassPromotionPolicy" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'ClassPromotionPolicy: % deleted', v_rows;

  DELETE FROM "StudentPromotionDecision" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentPromotionDecision: % deleted', v_rows;

  DELETE FROM "ClassSubject" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'ClassSubject: % deleted', v_rows;

  DELETE FROM "StudentEnrollment" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentEnrollment: % deleted', v_rows;

  DELETE FROM "EnrollmentApplication" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'EnrollmentApplication: % deleted', v_rows;

  -- Phase B: subject-dependent data (must run before Subject delete)
  DELETE FROM "AttendanceRecord" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'AttendanceRecord: % deleted', v_rows;

  DELETE FROM "AttendanceSession" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'AttendanceSession: % deleted', v_rows;

  DELETE FROM "SubjectMark" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectMark: % deleted', v_rows;

  DELETE FROM "SubjectDiscussionPost" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectDiscussionPost: % deleted', v_rows;

  DELETE FROM "SubjectDiscussionThread" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectDiscussionThread: % deleted', v_rows;

  DELETE FROM "CourseworkSubmission" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'CourseworkSubmission: % deleted', v_rows;

  DELETE FROM "CourseworkTask" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'CourseworkTask: % deleted', v_rows;

  DELETE FROM "TimetableSlot" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'TimetableSlot: % deleted', v_rows;

  DELETE FROM "LearningMaterial" WHERE "tenantId" = v_tenant AND "subjectId" IS NOT NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'LearningMaterial (subject-linked): % deleted', v_rows;

  DELETE FROM "ExamSession" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'ExamSession: % deleted', v_rows;

  DELETE FROM "SubjectAssignmentOffering" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectAssignmentOffering: % deleted', v_rows;

  DELETE FROM "SubjectAssignment" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectAssignment: % deleted', v_rows;

  DELETE FROM "SubjectSubBranch" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectSubBranch: % deleted', v_rows;

  -- Phase C: classes
  DELETE FROM "Class" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Class: % deleted', v_rows;

  -- Phase D: subjects and offerings (Subject.levelId FK → Level)
  DELETE FROM "SubjectStreamOffering" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'SubjectStreamOffering: % deleted', v_rows;

  DELETE FROM "Subject" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Subject: % deleted', v_rows;

  -- Phase E: student profile dependents (StudentProfile.currentLevelId → Level)
  DELETE FROM "TranscriptVersion" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'TranscriptVersion: % deleted', v_rows;

  DELETE FROM "TranscriptCopyRequest" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'TranscriptCopyRequest: % deleted', v_rows;

  DELETE FROM "Transcript" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Transcript: % deleted', v_rows;

  DELETE FROM "GuardianStudentLink" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'GuardianStudentLink: % deleted', v_rows;

  DELETE FROM "StudentScholarship" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentScholarship: % deleted', v_rows;

  DELETE FROM "StudentFeeInstallment" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentFeeInstallment: % deleted', v_rows;

  DELETE FROM "StudentFeeAccount" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentFeeAccount: % deleted', v_rows;

  DELETE FROM "StudentProfile" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'StudentProfile: % deleted', v_rows;

  -- Phase F: detach nullable level refs, then levels
  UPDATE "Term" SET "levelId" = NULL WHERE "tenantId" = v_tenant AND "levelId" IS NOT NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Term.levelId cleared: % rows', v_rows;

  DELETE FROM "Level" WHERE "tenantId" = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'Level: % deleted', v_rows;

  -- Phase G: legacy snake_case classes (optional)
  DELETE FROM public.class_students
  WHERE class_id IN (SELECT id FROM public.classes WHERE tenant_id = v_tenant);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'class_students (legacy): % deleted', v_rows;

  DELETE FROM public.classes WHERE tenant_id = v_tenant;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RAISE NOTICE 'classes (legacy): % deleted', v_rows;

  RAISE NOTICE '=== Done. Level and Class counts should be 0 for tenant %. ===', v_tenant;

  -- Dry run: uncomment the next line to undo all deletes in this block
  -- RAISE EXCEPTION 'DRY RUN — rolling back' USING ERRCODE = 'P0001';
END $$;

-- Verify (run after the DO block completes)
-- SELECT count(*) AS levels FROM "Level" WHERE "tenantId" = 'acadia-college-default';
-- SELECT count(*) AS classes FROM "Class" WHERE "tenantId" = 'acadia-college-default';
