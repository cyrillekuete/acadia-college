-- Remove the enrollment-application intake table. Year/class placement
-- stays on StudentEnrollment, created by Add student and promotion.

ALTER TABLE public."StudentEnrollment"
  DROP CONSTRAINT IF EXISTS "StudentEnrollment_applicationId_fkey";

ALTER TABLE public."StudentEnrollment"
  DROP COLUMN IF EXISTS "applicationId";

DROP TABLE IF EXISTS public."EnrollmentApplication";

DROP TYPE IF EXISTS public."EnrollmentApplicationKind";
DROP TYPE IF EXISTS public."EnrollmentApplicationStatus";
