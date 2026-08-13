-- Phase 1: link timetable slots to classes for class-based weekly grids.
-- classId is nullable so existing subject-scoped rows remain valid until backfilled.

ALTER TABLE public."TimetableSlot"
  ADD COLUMN IF NOT EXISTS "classId" text;

ALTER TABLE public."TimetableSlot"
  DROP CONSTRAINT IF EXISTS "TimetableSlot_classId_tenantId_fkey";

ALTER TABLE public."TimetableSlot"
  ADD CONSTRAINT "TimetableSlot_classId_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId")
    REFERENCES public."Class"("tenantId", id)
    ON DELETE RESTRICT;

-- When classId is set, the subject must be assigned to that class.
ALTER TABLE public."TimetableSlot"
  DROP CONSTRAINT IF EXISTS "TimetableSlot_classSubject_tenantId_fkey";

ALTER TABLE public."TimetableSlot"
  ADD CONSTRAINT "TimetableSlot_classSubject_tenantId_fkey"
    FOREIGN KEY ("tenantId", "classId", "subjectId")
    REFERENCES public."ClassSubject"("tenantId", "classId", "subjectId")
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "TimetableSlot_tenantId_academicYearId_classId_day_idx"
  ON public."TimetableSlot" ("tenantId", "academicYearId", "classId", "dayOfWeek", "startMinutes");

COMMENT ON COLUMN public."TimetableSlot"."classId" IS
  'Class this slot belongs to. Nullable during migration from subject-only slots; required for new class-based timetables.';
