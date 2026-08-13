-- Acadia College seed (run with service role on Supabase SQL editor or CLI)
-- Dev auth users: see supabase/migrations/20260516120000_acadia_college_dev_users.sql
-- Password Acadia2026! — admin@acadia-college.edu, staff@acadia-college.edu, student@acadia-college.edu

INSERT INTO "Tenant" (
  id,
  slug,
  "displayNameEn",
  "displayNameFr",
  status,
  "deploymentMode",
  locale,
  timezone,
  "updatedAt"
)
VALUES (
  'acadia-college-default',
  'acadia-college',
  'Acadia College',
  'Collège Acadia',
  'ACTIVE',
  'CLOUD',
  'en',
  'UTC',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "displayNameEn" = EXCLUDED."displayNameEn",
  "displayNameFr" = EXCLUDED."displayNameFr",
  "updatedAt" = NOW();
