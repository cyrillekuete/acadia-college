-- Official letterhead lines printed on report cards.

ALTER TABLE public."Tenant"
  ADD COLUMN IF NOT EXISTS "ministryNameEn" text,
  ADD COLUMN IF NOT EXISTS "ministryNameFr" text,
  ADD COLUMN IF NOT EXISTS "regionalDelegationEn" text,
  ADD COLUMN IF NOT EXISTS "regionalDelegationFr" text,
  ADD COLUMN IF NOT EXISTS "divisionalDelegationFr" text,
  ADD COLUMN IF NOT EXISTS "poBox" text;
