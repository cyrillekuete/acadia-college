-- Timetable module edge cases: publish columns, atomic slot writes, day bounds.

ALTER TABLE public."AcademicYear"
  ADD COLUMN IF NOT EXISTS "timetablePublishedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "timetablePublishedByUserId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AcademicYear_timetablePublishedByUserId_fkey'
  ) THEN
    ALTER TABLE public."AcademicYear"
      ADD CONSTRAINT "AcademicYear_timetablePublishedByUserId_fkey"
      FOREIGN KEY ("timetablePublishedByUserId")
      REFERENCES public."User"(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.acadia_write_timetable_slot(
  p_tenant_id text,
  p_slot_id text,
  p_exclude_slot_id text,
  p_academic_year_id text,
  p_class_id text,
  p_subject_id text,
  p_staff_profile_id text,
  p_room_id text,
  p_day_of_week integer,
  p_start_minutes integer,
  p_end_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_existing record;
BEGIN
  IF NOT public.acadia_is_registry_writer() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF public.acadia_current_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
  END IF;

  IF p_class_id IS NULL OR btrim(p_class_id) = '' THEN
    RAISE EXCEPTION 'class is required';
  END IF;

  IF p_day_of_week < 1 OR p_day_of_week > 6 THEN
    RAISE EXCEPTION 'day of week must be between 1 and 6';
  END IF;

  IF p_start_minutes >= p_end_minutes THEN
    RAISE EXCEPTION 'end time must be after start time';
  END IF;

  PERFORM 1
  FROM public."TimetableSlot"
  WHERE "tenantId" = p_tenant_id
    AND "academicYearId" = p_academic_year_id
    AND "dayOfWeek" = p_day_of_week
  FOR UPDATE;

  FOR v_existing IN
    SELECT id, "classId", "staffProfileId", "roomId", "startMinutes", "endMinutes"
    FROM public."TimetableSlot"
    WHERE "tenantId" = p_tenant_id
      AND "academicYearId" = p_academic_year_id
      AND "dayOfWeek" = p_day_of_week
      AND (p_exclude_slot_id IS NULL OR id <> p_exclude_slot_id)
  LOOP
    IF p_start_minutes < v_existing."endMinutes"
       AND v_existing."startMinutes" < p_end_minutes THEN
      IF v_existing."staffProfileId" = p_staff_profile_id THEN
        RAISE EXCEPTION 'teacher conflict on day %', p_day_of_week;
      END IF;
      IF v_existing."roomId" = p_room_id THEN
        RAISE EXCEPTION 'room conflict on day %', p_day_of_week;
      END IF;
      IF v_existing."classId" IS NOT NULL
         AND btrim(v_existing."classId") <> ''
         AND v_existing."classId" = p_class_id THEN
        RAISE EXCEPTION 'class conflict on day %', p_day_of_week;
      END IF;
    END IF;
  END LOOP;

  IF p_exclude_slot_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public."TimetableSlot"
    WHERE id = p_exclude_slot_id
      AND "tenantId" = p_tenant_id
  ) THEN
    UPDATE public."TimetableSlot"
    SET
      "academicYearId" = p_academic_year_id,
      "classId" = p_class_id,
      "subjectId" = p_subject_id,
      "staffProfileId" = p_staff_profile_id,
      "roomId" = p_room_id,
      "dayOfWeek" = p_day_of_week,
      "startMinutes" = p_start_minutes,
      "endMinutes" = p_end_minutes,
      "updatedAt" = v_now
    WHERE id = p_exclude_slot_id
      AND "tenantId" = p_tenant_id;
    RETURN;
  END IF;

  INSERT INTO public."TimetableSlot" (
    id,
    "tenantId",
    "academicYearId",
    "classId",
    "subjectId",
    "staffProfileId",
    "roomId",
    "dayOfWeek",
    "startMinutes",
    "endMinutes",
    "createdAt",
    "updatedAt"
  ) VALUES (
    p_slot_id,
    p_tenant_id,
    p_academic_year_id,
    p_class_id,
    p_subject_id,
    p_staff_profile_id,
    p_room_id,
    p_day_of_week,
    p_start_minutes,
    p_end_minutes,
    v_now,
    v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.acadia_write_timetable_slot(
  text, text, text, text, text, text, text, text, integer, integer, integer
) TO authenticated;
