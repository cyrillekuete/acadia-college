-- Seed Cameroon specialty streams (sub-system × branch) and level labels per sub-system.

DO $$
DECLARE
  t_id text;
  dept_id text := 'acadia-general-dept';
  stream record;
  spec_id text;
  lvl record;
  now_ts timestamp := NOW();
  grading_system "SpecialtyGradingSystem";
BEGIN
  SELECT id INTO t_id FROM "Tenant" WHERE id = '117b136b-002f-4833-bc31-08f47da658bd'
  UNION ALL
  SELECT id FROM "Tenant" WHERE id = 'acadia-college-default'
  LIMIT 1;

  IF t_id IS NULL THEN
    RAISE NOTICE 'No dev tenant found; skip Cameroon catalog seed.';
    RETURN;
  END IF;

  INSERT INTO "Department" (id, "tenantId", code, "nameEn", "nameFr", "updatedAt")
  VALUES (
    dept_id,
    t_id,
    'GEN',
    'General studies',
    'Études générales',
    now_ts
  )
  ON CONFLICT (id) DO NOTHING;

  -- English Grammar (legacy sample specialty)
  UPDATE "Specialty"
  SET
    "subSystem" = 'ENGLISH',
    branch = 'GRAMMAR',
    "departmentId" = dept_id,
    code = COALESCE(NULLIF(btrim(code), ''), 'EN-GRAM'),
    "updatedAt" = now_ts
  WHERE id = 'acadia-sample-spec' AND "tenantId" = t_id;

  FOR stream IN
    SELECT * FROM (VALUES
      ('ENGLISH'::public."AcademicSubSystem", 'GRAMMAR'::public."AcademicBranch", 'en-gram', 'English — Grammar', 'Anglophone — Général'),
      ('ENGLISH', 'TECHNICAL', 'en-tech', 'English — Technical', 'Anglophone — Technique'),
      ('ENGLISH', 'COMMERCIAL', 'en-comm', 'English — Commercial', 'Anglophone — Commercial'),
      ('FRENCH', 'GRAMMAR', 'fr-gram', 'French — Grammar', 'Francophone — Général'),
      ('FRENCH', 'TECHNICAL', 'fr-tech', 'French — Technical', 'Francophone — Technique'),
      ('FRENCH', 'COMMERCIAL', 'fr-comm', 'French — Commercial', 'Francophone — Commercial')
    ) AS v("subSystem", branch, code, "nameEn", "nameFr")
  LOOP
    spec_id := 'acadia-spec-' || stream.code;

    -- Map sub-system to grading system
    IF stream."subSystem" = 'ENGLISH' THEN
      grading_system := 'ANGLOPHONE';
    ELSE
      grading_system := 'FRANCOPHONE';
    END IF;

    INSERT INTO "Specialty" (
      id,
      "tenantId",
      "departmentId",
      code,
      "nameEn",
      "nameFr",
      "subSystem",
      branch,
      "durationYears",
      "gradingSystem",
      "updatedAt"
    )
    VALUES (
      spec_id,
      t_id,
      dept_id,
      upper(stream.code),
      stream."nameEn",
      stream."nameFr",
      stream."subSystem",
      stream.branch,
      7,
      grading_system,
      now_ts
    )
    ON CONFLICT (id) DO UPDATE SET
      "subSystem" = EXCLUDED."subSystem",
      branch = EXCLUDED.branch,
      "nameEn" = EXCLUDED."nameEn",
      "nameFr" = EXCLUDED."nameFr",
      "updatedAt" = now_ts;

    -- English levels
    IF stream."subSystem" = 'ENGLISH' THEN
      FOR lvl IN
        SELECT * FROM (VALUES
          (1, 'Form 1', 'Form 1', 1),
          (2, 'Form 2', 'Form 2', 2),
          (3, 'Form 3', 'Form 3', 3),
          (4, 'Form 4', 'Form 4', 4),
          (5, 'Form 5', 'Form 5', 5),
          (6, 'Lower Sixth', 'Lower Sixth', 6),
          (7, 'Upper Sixth', 'Upper Sixth', 7)
        ) AS l(number, "labelEn", "labelFr", "sortOrder")
      LOOP
        INSERT INTO "Level" (
          id, "tenantId", "specialtyId", number, "labelEn", "labelFr", "sortOrder"
        )
        VALUES (
          spec_id || '-lvl-' || lvl.number::text,
          t_id,
          spec_id,
          lvl.number,
          lvl."labelEn",
          lvl."labelFr",
          lvl."sortOrder"
        )
        ON CONFLICT (id) DO UPDATE SET
          "labelEn" = EXCLUDED."labelEn",
          "labelFr" = EXCLUDED."labelFr",
          "sortOrder" = EXCLUDED."sortOrder";
      END LOOP;
    ELSE
      FOR lvl IN
        SELECT * FROM (VALUES
          (1, 'Sixième', 'Sixième', 1),
          (2, 'Cinquième', 'Cinquième', 2),
          (3, 'Quatrième', 'Quatrième', 3),
          (4, 'Troisième', 'Troisième', 4),
          (5, 'Seconde', 'Seconde', 5),
          (6, 'Première', 'Première', 6),
          (7, 'Terminale', 'Terminale', 7)
        ) AS l(number, "labelEn", "labelFr", "sortOrder")
      LOOP
        INSERT INTO "Level" (
          id, "tenantId", "specialtyId", number, "labelEn", "labelFr", "sortOrder"
        )
        VALUES (
          spec_id || '-lvl-' || lvl.number::text,
          t_id,
          spec_id,
          lvl.number,
          lvl."labelEn",
          lvl."labelFr",
          lvl."sortOrder"
        )
        ON CONFLICT (id) DO UPDATE SET
          "labelEn" = EXCLUDED."labelEn",
          "labelFr" = EXCLUDED."labelFr",
          "sortOrder" = EXCLUDED."sortOrder";
      END LOOP;
    END IF;
  END LOOP;

  -- Ensure legacy sample level has English Form 1 label
  UPDATE "Level"
  SET
    "labelEn" = 'Form 1',
    "labelFr" = 'Form 1',
    "sortOrder" = 1
  WHERE id = 'acadia-sample-level' AND "tenantId" = t_id;
END $$;
