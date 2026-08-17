-- Dedicated crest/logo for report cards and class reports, separate from the
-- app chrome institution logo.

ALTER TABLE public."Tenant"
  ADD COLUMN IF NOT EXISTS "reportCardLogoStorageKey" text;
