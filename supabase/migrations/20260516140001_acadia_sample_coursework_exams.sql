-- Sample coursework tasks, one submission, and exam sessions for the dev tenant.
-- Idempotent: skips when sample task already exists.

DO $$
DECLARE
  t_id text := '117b136b-002f-4833-bc31-08f47da658bd';
  student_user text := 'a0000001-0001-4000-8000-000000000003';
  dept_id text := 'acadia-sample-dept';
  spec_id text := 'acadia-sample-spec';
  level_id text := 'acadia-sample-level';
  sem_id text := 'acadia-sample-sem';
  year_id text := 'acadia-sample-year';
  course_id text := 'acadia-sample-course';
  student_profile_id text := 'acadia-sample-student';
  task_id text := 'acadia-sample-coursework-1';
  submission_id text := 'acadia-sample-submission-1';
  exam_id text := 'acadia-sample-exam-1';
  grading_label text;
  now_ts timestamp := NOW();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Tenant" WHERE id = t_id) THEN
    RAISE NOTICE 'Dev tenant % not found; skip sample coursework/exam seed.', t_id;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM "CourseworkTask" WHERE id = task_id) THEN
    RETURN;
  END IF;

  SELECT e.enumlabel INTO grading_label
  FROM pg_enum e
  JOIN pg_type ty ON e.enumtypid = ty.oid
  WHERE ty.typname = 'GradingSystem'
  ORDER BY e.enumsortorder
  LIMIT 1;

  IF grading_label IS NULL THEN
    grading_label := 'STANDARD';
  END IF;

  INSERT INTO "Department" (id, "tenantId", code, "nameEn", "nameFr", "updatedAt")
  VALUES (dept_id, t_id, 'CS', 'Computer Science', 'Informatique', now_ts)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "Specialty" (
    id, "tenantId", "departmentId", code, "nameEn", "nameFr",
    "durationYears", "gradingSystem", "updatedAt"
  )
  VALUES (
    spec_id, t_id, dept_id, 'CS-GEN', 'General Computing', 'Informatique générale',
    3, grading_label::"GradingSystem", now_ts
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "Level" (id, "tenantId", "specialtyId", number)
  VALUES (level_id, t_id, spec_id, 1)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "Semester" (id, "tenantId", "levelId", number)
  VALUES (sem_id, t_id, level_id, 1)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "AcademicYear" (
    id, "tenantId", label, "startsOn", "endsOn", "isCurrent", "isActive", "updatedAt"
  )
  VALUES (
    year_id, t_id, '2025-2026', '2025-09-01'::date, '2026-07-31'::date, true, true, now_ts
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "Course" (
    id, "tenantId", code, "nameEn", "nameFr", credits, hours,
    "specialtyId", "levelId", "semesterId", "updatedAt"
  )
  VALUES (
    course_id, t_id, 'CS101', 'Introduction to Computing', 'Introduction à l''informatique',
    3, 45, spec_id, level_id, sem_id, now_ts
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "StudentProfile" (
    id, "tenantId", "userId", "registrationNumber",
    "specialtyId", "currentLevelId", "updatedAt"
  )
  VALUES (
    student_profile_id, t_id, student_user, 'AC-2026-001',
    spec_id, level_id, now_ts
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO "CourseworkTask" (
    id, "tenantId", "academicYearId", "courseId",
    "titleEn", "titleFr", "descriptionEn", "descriptionFr",
    "dueAt", "maxScore", "isPublished", "updatedAt"
  )
  VALUES (
    task_id, t_id, year_id, course_id,
    'Lab report 1', 'Rapport de laboratoire 1',
    'Submit your first lab report as PDF.',
    'Soumettez votre premier rapport de laboratoire en PDF.',
    now_ts + interval '14 days', 20, true, now_ts
  );

  INSERT INTO "CourseworkSubmission" (
    id, "tenantId", "taskId", "studentProfileId",
    status, "submittedAt", "updatedAt"
  )
  VALUES (
    submission_id, t_id, task_id, student_profile_id,
    'SUBMITTED'::"CourseworkSubmissionStatus", now_ts, now_ts
  );

  INSERT INTO "ExamSession" (
    id, "tenantId", "academicYearId", "courseId", "semesterId",
    type, "startsOn", "endsOn", "updatedAt"
  )
  VALUES (
    exam_id, t_id, year_id, course_id, sem_id,
    'NORMAL'::"ExamSessionType", '2026-06-01'::date, '2026-06-15'::date, now_ts
  );

  INSERT INTO "CourseworkTask" (
    id, "tenantId", "academicYearId", "courseId",
    "titleEn", "titleFr", "dueAt", "maxScore", "isPublished", "updatedAt"
  )
  VALUES (
    'acadia-sample-coursework-2', t_id, year_id, course_id,
    'Midterm essay', 'Dissertation de mi-parcours',
    now_ts + interval '30 days', 30, true, now_ts
  );
END $$;
