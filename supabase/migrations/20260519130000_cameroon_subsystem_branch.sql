-- Cameroon educational system: English/French sub-systems and Grammar/Technical/Commercial branches.

CREATE TYPE public."AcademicSubSystem" AS ENUM ('ENGLISH', 'FRENCH');

CREATE TYPE public."AcademicBranch" AS ENUM ('GRAMMAR', 'TECHNICAL', 'COMMERCIAL');

ALTER TABLE public."Specialty"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem" NOT NULL DEFAULT 'ENGLISH',
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch" NOT NULL DEFAULT 'GRAMMAR';

ALTER TABLE public."Level"
  ADD COLUMN IF NOT EXISTS "labelEn" text,
  ADD COLUMN IF NOT EXISTS "labelFr" text,
  ADD COLUMN IF NOT EXISTS "sortOrder" integer;

ALTER TABLE public."EnrollmentApplication"
  ADD COLUMN IF NOT EXISTS "subSystem" public."AcademicSubSystem",
  ADD COLUMN IF NOT EXISTS branch public."AcademicBranch";

-- Backfill applications from linked specialty when possible
UPDATE public."EnrollmentApplication" ea
SET
  "subSystem" = s."subSystem",
  branch = s.branch
FROM public."Specialty" s
WHERE ea."specialtyId" = s.id
  AND ea."subSystem" IS NULL;

ALTER TABLE public."Specialty"
  DROP CONSTRAINT IF EXISTS "Specialty_tenantId_subSystem_branch_code_key";

ALTER TABLE public."Specialty"
  ADD CONSTRAINT "Specialty_tenantId_subSystem_branch_code_key"
  UNIQUE ("tenantId", "subSystem", branch, code);
