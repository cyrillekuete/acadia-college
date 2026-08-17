-- Acadia does not require email verification. Confirm existing Auth users
-- and stamp User.emailVerifiedAt so profiles show as verified.

UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, created_at, NOW()),
  confirmation_token = '',
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

UPDATE public."User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt", NOW())
WHERE "emailVerifiedAt" IS NULL;

ALTER TABLE public."User"
  ALTER COLUMN "emailVerifiedAt" SET DEFAULT NOW();
