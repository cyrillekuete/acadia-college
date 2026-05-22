-- Split system Student ID (registrationNumber) from optional ministry Matricule.

ALTER TABLE public."StudentProfile"
  ADD COLUMN IF NOT EXISTS "matriculeNumber" character varying;

-- Legacy rows stored auto-generated AC-* values in matricule_number; those are Student IDs, not ministry matricules.
UPDATE public.students
SET matricule_number = NULL
WHERE matricule_number ~ '^AC-[0-9]{4}-';
