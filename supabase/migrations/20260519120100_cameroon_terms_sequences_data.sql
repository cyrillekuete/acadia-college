-- Seed Cameroon terms (3 per academic year) and sequences (6 per year) for dev tenant.

DO $$
DECLARE
  t_id text := '117b136b-002f-4833-bc31-08f47da658bd';
  year_id text := 'acadia-sample-year';
  term1_id text := 'acadia-term-1';
  term2_id text := 'acadia-term-2';
  term3_id text := 'acadia-term-3';
  old_sem_id text := 'acadia-sample-sem';
  seq_n integer;
  term_id text;
  term_num integer;
  seq_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Tenant" WHERE id = t_id) THEN
    RAISE NOTICE 'Dev tenant not found; skip terms/sequences seed.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "AcademicYear" WHERE id = year_id) THEN
    INSERT INTO "AcademicYear" (
      id, "tenantId", label, "startsOn", "endsOn", "isCurrent", "isActive", "updatedAt"
    )
    VALUES (
      year_id, t_id, '2025-2026', '2025-09-01'::date, '2026-07-31'::date, true, true, NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrate legacy sample semester row if present
  IF EXISTS (SELECT 1 FROM "Term" WHERE id = old_sem_id) THEN
    UPDATE "Term"
    SET "academicYearId" = year_id, number = 1
    WHERE id = old_sem_id AND "academicYearId" IS NULL;
  END IF;

  INSERT INTO "Term" (id, "tenantId", "academicYearId", number)
  VALUES
    (term1_id, t_id, year_id, 1),
    (term2_id, t_id, year_id, 2),
    (term3_id, t_id, year_id, 3)
  ON CONFLICT (id) DO UPDATE SET
    "academicYearId" = EXCLUDED."academicYearId",
    number = EXCLUDED.number;

  -- Point sample course/exam at term 1 if they used legacy sem id
  UPDATE "Course" SET "termId" = term1_id
  WHERE "tenantId" = t_id AND "termId" = old_sem_id;

  UPDATE "ExamSession" SET "termId" = term1_id
  WHERE "tenantId" = t_id AND "termId" = old_sem_id;

  FOR seq_n IN 1..6 LOOP
    term_num := ((seq_n - 1) / 2) + 1;
    term_id := CASE term_num
      WHEN 1 THEN term1_id
      WHEN 2 THEN term2_id
      ELSE term3_id
    END;
    seq_id := 'acadia-seq-' || seq_n::text;

    INSERT INTO "AcademicSequence" (
      id, "tenantId", "academicYearId", "termId", number, "numberInTerm"
    )
    VALUES (
      seq_id,
      t_id,
      year_id,
      term_id,
      seq_n,
      CASE WHEN seq_n % 2 = 1 THEN 1 ELSE 2 END
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  UPDATE "ExamSession"
  SET "sequenceId" = 'acadia-seq-3'
  WHERE id = 'acadia-sample-exam-1' AND "sequenceId" IS NULL;
END $$;
