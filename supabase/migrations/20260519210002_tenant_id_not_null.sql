-- Enforce NOT NULL on tenant_id for the three multi-tenant tables.
-- The baseline migration was corrected, but this migration covers any
-- environment where the baseline had already been applied with nullable columns.

ALTER TABLE public.users
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.students
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.parents
  ALTER COLUMN tenant_id SET NOT NULL;
