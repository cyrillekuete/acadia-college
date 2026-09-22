-- Student provisioning links each parent to UserRole slug parent or guardian.
-- Metronic's role seed never created that row, so create student returned 500
-- ("Parent/guardian role is not configured") and rolled the student back.
-- A trashed parent/guardian row would still miss the active lookup and would
-- also block a fresh insert on the unique slug.

UPDATE public."UserRole"
SET "isTrashed" = false
WHERE lower(slug) IN ('parent', 'guardian')
  AND "isTrashed" = true
  AND NOT EXISTS (
    SELECT 1
    FROM public."UserRole" active
    WHERE lower(active.slug) IN ('parent', 'guardian')
      AND active."isTrashed" = false
  );

INSERT INTO public."UserRole" (
  id,
  slug,
  name,
  description,
  "isTrashed",
  "isProtected",
  "isDefault",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  'parent',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public."UserRole"
      WHERE lower(name) = 'parent'
    ) THEN 'Parent / Guardian'
    ELSE 'Parent'
  END,
  'Parent or guardian linked to one or more students.',
  false,
  true,
  false,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM public."UserRole"
  WHERE lower(slug) IN ('parent', 'guardian')
);
