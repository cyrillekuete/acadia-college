-- Exam session edge cases: uniqueness, placement, finalized immutability.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public."ExamSession"
    WHERE type = 'NORMAL' AND "sequenceId" IS NOT NULL
    GROUP BY "tenantId", "academicYearId", "subjectId", "sequenceId"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "ExamSession_normal_sequence_uidx"
      ON public."ExamSession" ("tenantId", "academicYearId", "subjectId", "sequenceId")
      WHERE type = 'NORMAL' AND "sequenceId" IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."ExamSession"
    WHERE type = 'RESIT' AND "sequenceId" IS NOT NULL
    GROUP BY "tenantId", "academicYearId", "subjectId", "sequenceId"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "ExamSession_resit_sequence_uidx"
      ON public."ExamSession" ("tenantId", "academicYearId", "subjectId", "sequenceId")
      WHERE type = 'RESIT' AND "sequenceId" IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."ExamSession"
    WHERE type IN ('GCE', 'BEPC', 'PROBATOIRE', 'BACCALAUREAT')
    GROUP BY "tenantId", "academicYearId", "subjectId", type
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "ExamSession_major_type_uidx"
      ON public."ExamSession" ("tenantId", "academicYearId", "subjectId", type)
      WHERE type IN ('GCE', 'BEPC', 'PROBATOIRE', 'BACCALAUREAT');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.acadia_exam_session_write_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  seq_term_id text;
  seq_year_id text;
  term_year_id text;
BEGIN
  SELECT "academicYearId" INTO term_year_id
  FROM public."Term"
  WHERE id = NEW."termId";

  IF term_year_id IS DISTINCT FROM NEW."academicYearId" THEN
    RAISE EXCEPTION 'Term must belong to the selected academic year';
  END IF;

  IF NEW."sequenceId" IS NOT NULL THEN
    SELECT "termId", "academicYearId" INTO seq_term_id, seq_year_id
    FROM public."AcademicSequence"
    WHERE id = NEW."sequenceId";

    IF seq_term_id IS DISTINCT FROM NEW."termId" THEN
      RAISE EXCEPTION 'Sequence must belong to the selected term';
    END IF;

    IF seq_year_id IS DISTINCT FROM NEW."academicYearId" THEN
      RAISE EXCEPTION 'Sequence must belong to the same academic year as its term.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."finalizedAt" IS NOT NULL THEN
    IF NEW."academicYearId" IS DISTINCT FROM OLD."academicYearId"
       OR NEW."subjectId" IS DISTINCT FROM OLD."subjectId"
       OR NEW."termId" IS DISTINCT FROM OLD."termId"
       OR NEW."sequenceId" IS DISTINCT FROM OLD."sequenceId"
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW."startsOn" IS DISTINCT FROM OLD."startsOn"
       OR NEW."endsOn" IS DISTINCT FROM OLD."endsOn"
       OR NEW."finalizedAt" IS DISTINCT FROM OLD."finalizedAt"
       OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
    THEN
      RAISE EXCEPTION 'Finalized exam sessions cannot be edited';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_session_write_guard ON public."ExamSession";
CREATE TRIGGER exam_session_write_guard
  BEFORE INSERT OR UPDATE ON public."ExamSession"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_exam_session_write_guard();
