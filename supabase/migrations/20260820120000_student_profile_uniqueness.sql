-- Student registry uniqueness: one Student ID, one user, one matricule per tenant.

UPDATE public."StudentProfile"
SET "matriculeNumber" = NULL
WHERE "matriculeNumber" IS NOT NULL
  AND btrim("matriculeNumber") = '';

CREATE TEMP TABLE student_profile_dupes ON COMMIT DROP AS
SELECT id
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "registrationNumber"
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM public."StudentProfile"
) ranked
WHERE rn > 1
UNION
SELECT id
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "matriculeNumber"
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM public."StudentProfile"
  WHERE "matriculeNumber" IS NOT NULL
) ranked
WHERE rn > 1
UNION
SELECT id
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "userId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM public."StudentProfile"
) ranked
WHERE rn > 1;

DELETE FROM public."StudentFeeInstallment"
WHERE "studentFeeAccountId" IN (
  SELECT id FROM public."StudentFeeAccount"
  WHERE "studentProfileId" IN (SELECT id FROM student_profile_dupes)
);
DELETE FROM public."StudentFeeAccount"
WHERE "studentProfileId" IN (SELECT id FROM student_profile_dupes);
DELETE FROM public."StudentEnrollment"
WHERE "studentProfileId" IN (SELECT id FROM student_profile_dupes);
DELETE FROM public."GuardianStudentLink"
WHERE "studentProfileId" IN (SELECT id FROM student_profile_dupes);
DELETE FROM public."StudentProfile"
WHERE id IN (SELECT id FROM student_profile_dupes);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_tenant_registration_uidx"
  ON public."StudentProfile" ("tenantId", "registrationNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_tenant_matricule_uidx"
  ON public."StudentProfile" ("tenantId", "matriculeNumber")
  WHERE "matriculeNumber" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_tenant_user_uidx"
  ON public."StudentProfile" ("tenantId", "userId");
