-- Rename curriculum catalog entity: Course → Subject

-- 1. Rename tables
ALTER TABLE public."Course" RENAME TO "Subject";
ALTER TABLE public."CourseSpecialtyOffering" RENAME TO "SubjectSpecialtyOffering";
ALTER TABLE public."CourseAssignment" RENAME TO "SubjectAssignment";
ALTER TABLE public."CourseAssignmentOffering" RENAME TO "SubjectAssignmentOffering";
ALTER TABLE public."CourseDiscussionThread" RENAME TO "SubjectDiscussionThread";
ALTER TABLE public."CourseDiscussionPost" RENAME TO "SubjectDiscussionPost";
ALTER TABLE public."CourseMark" RENAME TO "SubjectMark";

-- 2. Rename FK columns (courseId → subjectId)
ALTER TABLE public."AttendanceSession" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."ExamSession" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."LearningMaterial" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."TimetableSlot" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."SubjectAssignment" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."SubjectDiscussionThread" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."SubjectMark" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."SubjectSpecialtyOffering" RENAME COLUMN "courseId" TO "subjectId";
ALTER TABLE public."CourseworkTask" RENAME COLUMN "courseId" TO "subjectId";

-- 3. Rename assignment-offering junction column
ALTER TABLE public."SubjectAssignmentOffering"
  RENAME COLUMN "courseAssignmentId" TO "subjectAssignmentId";

-- 4. Rename constraints on Subject
ALTER TABLE public."Subject" RENAME CONSTRAINT "Course_levelId_tenantId_fkey" TO "Subject_levelId_tenantId_fkey";
ALTER TABLE public."Subject" RENAME CONSTRAINT "Course_semesterId_tenantId_fkey" TO "Subject_semesterId_tenantId_fkey";
ALTER TABLE public."Subject" RENAME CONSTRAINT "Course_specialtyId_tenantId_fkey" TO "Subject_specialtyId_tenantId_fkey";
ALTER TABLE public."Subject" RENAME CONSTRAINT "Course_tenantId_fkey" TO "Subject_tenantId_fkey";

-- 5. Rename constraints on SubjectAssignment
ALTER TABLE public."SubjectAssignment" RENAME CONSTRAINT "CourseAssignment_academicYearId_tenantId_fkey" TO "SubjectAssignment_academicYearId_tenantId_fkey";
ALTER TABLE public."SubjectAssignment" RENAME CONSTRAINT "CourseAssignment_courseId_tenantId_fkey" TO "SubjectAssignment_subjectId_tenantId_fkey";
ALTER TABLE public."SubjectAssignment" RENAME CONSTRAINT "CourseAssignment_staffProfileId_tenantId_fkey" TO "SubjectAssignment_staffProfileId_tenantId_fkey";
ALTER TABLE public."SubjectAssignment" RENAME CONSTRAINT "CourseAssignment_tenantId_fkey" TO "SubjectAssignment_tenantId_fkey";

-- 6. Rename constraints on SubjectAssignmentOffering
ALTER TABLE public."SubjectAssignmentOffering" RENAME CONSTRAINT "CourseAssignmentOffering_courseAssignmentId_tenantId_fkey" TO "SubjectAssignmentOffering_subjectAssignmentId_tenantId_fkey";
ALTER TABLE public."SubjectAssignmentOffering" RENAME CONSTRAINT "CourseAssignmentOffering_offeringId_tenantId_fkey" TO "SubjectAssignmentOffering_offeringId_tenantId_fkey";
ALTER TABLE public."SubjectAssignmentOffering" RENAME CONSTRAINT "CourseAssignmentOffering_tenantId_fkey" TO "SubjectAssignmentOffering_tenantId_fkey";

-- 7. Rename constraints on SubjectDiscussionThread / Post
ALTER TABLE public."SubjectDiscussionThread" RENAME CONSTRAINT "CourseDiscussionThread_academicYearId_tenantId_fkey" TO "SubjectDiscussionThread_academicYearId_tenantId_fkey";
ALTER TABLE public."SubjectDiscussionThread" RENAME CONSTRAINT "CourseDiscussionThread_courseId_tenantId_fkey" TO "SubjectDiscussionThread_subjectId_tenantId_fkey";
ALTER TABLE public."SubjectDiscussionThread" RENAME CONSTRAINT "CourseDiscussionThread_tenantId_fkey" TO "SubjectDiscussionThread_tenantId_fkey";

ALTER TABLE public."SubjectDiscussionPost" RENAME CONSTRAINT "CourseDiscussionPost_authorUserId_fkey" TO "SubjectDiscussionPost_authorUserId_fkey";
ALTER TABLE public."SubjectDiscussionPost" RENAME CONSTRAINT "CourseDiscussionPost_hiddenByUserId_fkey" TO "SubjectDiscussionPost_hiddenByUserId_fkey";
ALTER TABLE public."SubjectDiscussionPost" RENAME CONSTRAINT "CourseDiscussionPost_tenantId_fkey" TO "SubjectDiscussionPost_tenantId_fkey";
ALTER TABLE public."SubjectDiscussionPost" RENAME CONSTRAINT "CourseDiscussionPost_threadId_tenantId_fkey" TO "SubjectDiscussionPost_threadId_tenantId_fkey";

-- 8. Rename constraints on SubjectMark
ALTER TABLE public."SubjectMark" RENAME CONSTRAINT "CourseMark_courseId_tenantId_fkey" TO "SubjectMark_subjectId_tenantId_fkey";
ALTER TABLE public."SubjectMark" RENAME CONSTRAINT "CourseMark_enteredByUserId_fkey" TO "SubjectMark_enteredByUserId_fkey";
ALTER TABLE public."SubjectMark" RENAME CONSTRAINT "CourseMark_examSessionId_tenantId_fkey" TO "SubjectMark_examSessionId_tenantId_fkey";
ALTER TABLE public."SubjectMark" RENAME CONSTRAINT "CourseMark_studentProfileId_tenantId_fkey" TO "SubjectMark_studentProfileId_tenantId_fkey";
ALTER TABLE public."SubjectMark" RENAME CONSTRAINT "CourseMark_tenantId_fkey" TO "SubjectMark_tenantId_fkey";

-- 9. Rename constraints on SubjectSpecialtyOffering
ALTER TABLE public."SubjectSpecialtyOffering" RENAME CONSTRAINT "CourseSpecialtyOffering_courseId_tenantId_fkey" TO "SubjectSpecialtyOffering_subjectId_tenantId_fkey";
ALTER TABLE public."SubjectSpecialtyOffering" RENAME CONSTRAINT "CourseSpecialtyOffering_levelId_tenantId_fkey" TO "SubjectSpecialtyOffering_levelId_tenantId_fkey";
ALTER TABLE public."SubjectSpecialtyOffering" RENAME CONSTRAINT "CourseSpecialtyOffering_semesterId_tenantId_fkey" TO "SubjectSpecialtyOffering_semesterId_tenantId_fkey";
ALTER TABLE public."SubjectSpecialtyOffering" RENAME CONSTRAINT "CourseSpecialtyOffering_specialtyId_tenantId_fkey" TO "SubjectSpecialtyOffering_specialtyId_tenantId_fkey";
ALTER TABLE public."SubjectSpecialtyOffering" RENAME CONSTRAINT "CourseSpecialtyOffering_tenantId_fkey" TO "SubjectSpecialtyOffering_tenantId_fkey";

-- 10. Rename constraints on referencing tables
ALTER TABLE public."AttendanceSession" RENAME CONSTRAINT "AttendanceSession_courseId_tenantId_fkey" TO "AttendanceSession_subjectId_tenantId_fkey";
ALTER TABLE public."ExamSession" RENAME CONSTRAINT "ExamSession_courseId_tenantId_fkey" TO "ExamSession_subjectId_tenantId_fkey";
ALTER TABLE public."LearningMaterial" RENAME CONSTRAINT "LearningMaterial_courseId_fkey" TO "LearningMaterial_subjectId_fkey";
ALTER TABLE public."TimetableSlot" RENAME CONSTRAINT "TimetableSlot_courseId_tenantId_fkey" TO "TimetableSlot_subjectId_tenantId_fkey";
ALTER TABLE public."CourseworkTask" RENAME CONSTRAINT "CourseworkTask_courseId_tenantId_fkey" TO "CourseworkTask_subjectId_tenantId_fkey";

-- 11. Re-apply RLS for renamed registry table (Subject, formerly Course)
DO $$
DECLARE
  old_prefix text := 'Course';
  new_prefix text := 'Subject';
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', new_prefix);

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_select_tenant', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
    new_prefix || '_select_tenant',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_insert_admin', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    new_prefix || '_insert_admin',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_update_admin', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    new_prefix || '_update_admin',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_delete_admin', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin_or_registrar())',
    new_prefix || '_delete_admin',
    new_prefix
  );
END $$;

-- 12. Re-apply RLS for renamed operations table (SubjectMark, formerly CourseMark)
DO $$
DECLARE
  old_prefix text := 'CourseMark';
  new_prefix text := 'SubjectMark';
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', new_prefix);

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_select_tenant', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id())',
    new_prefix || '_select_tenant',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_insert_staff', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
    new_prefix || '_insert_staff',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_update_staff', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher()) WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
    new_prefix || '_update_staff',
    new_prefix
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_prefix || '_delete_staff', new_prefix);
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_staff_or_teacher())',
    new_prefix || '_delete_staff',
    new_prefix
  );
END $$;
