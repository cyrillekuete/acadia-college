-- WhatsApp outbound for guardian alerts and 1:1 messages.
-- Also backfills PascalCase parent User rows and GuardianStudentLink
-- so class / all-guardians targeting can resolve recipients.

ALTER TYPE public."SchoolAlertChannel" ADD VALUE IF NOT EXISTS 'whatsapp';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppOutboundStatus') THEN
    CREATE TYPE public."WhatsAppOutboundStatus" AS ENUM (
      'queued',
      'sent',
      'delivered',
      'read',
      'failed',
      'skipped'
    );
  END IF;
END $$;

ALTER TABLE public."SchoolAlertRecipient"
  ADD COLUMN IF NOT EXISTS "whatsappPhone" text,
  ADD COLUMN IF NOT EXISTS "whatsappMessageId" text,
  ADD COLUMN IF NOT EXISTS "whatsappStatus" public."WhatsAppOutboundStatus",
  ADD COLUMN IF NOT EXISTS "whatsappError" text;

CREATE INDEX IF NOT EXISTS "SchoolAlertRecipient_whatsapp_message_idx"
  ON public."SchoolAlertRecipient" ("whatsappMessageId")
  WHERE "whatsappMessageId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."WhatsAppOutbound" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "messageId" text NOT NULL,
  "recipientUserId" text NOT NULL,
  "whatsappPhone" text,
  "whatsappMessageId" text,
  "whatsappStatus" public."WhatsAppOutboundStatus" NOT NULL DEFAULT 'queued'::public."WhatsAppOutboundStatus",
  "whatsappError" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "WhatsAppOutbound_pkey" PRIMARY KEY (id),
  CONSTRAINT "WhatsAppOutbound_message_recipient_key"
    UNIQUE ("messageId", "recipientUserId"),
  CONSTRAINT "WhatsAppOutbound_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "WhatsAppOutbound_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON DELETE CASCADE,
  CONSTRAINT "WhatsAppOutbound_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS "WhatsAppOutbound_tenant_idx"
  ON public."WhatsAppOutbound" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "WhatsAppOutbound_graph_message_idx"
  ON public."WhatsAppOutbound" ("whatsappMessageId")
  WHERE "whatsappMessageId" IS NOT NULL;

ALTER TABLE public."WhatsAppOutbound" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "WhatsAppOutbound_select_staff" ON public."WhatsAppOutbound";
CREATE POLICY "WhatsAppOutbound_select_staff"
  ON public."WhatsAppOutbound"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "recipientUserId" = auth.uid()::text
    )
  );

-- PascalCase User for legacy parent accounts (same id as snake_case users / Auth).
INSERT INTO public."User" (
  id,
  email,
  name,
  "roleId",
  "tenantId",
  status,
  "emailVerifiedAt",
  "createdAt",
  "updatedAt",
  "isTrashed",
  "isProtected"
)
SELECT
  u.id::text,
  u.email,
  COALESCE(NULLIF(btrim(u.name), ''), u.email),
  r.id,
  u.tenant_id::text,
  'ACTIVE'::public."UserStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  false,
  false
FROM public.users u
JOIN LATERAL (
  SELECT ur.id
  FROM public."UserRole" ur
  WHERE ur."isTrashed" = false
    AND ur.slug IN ('parent', 'guardian')
  ORDER BY CASE ur.slug WHEN 'parent' THEN 0 ELSE 1 END
  LIMIT 1
) r ON true
WHERE u.role = 'parent'
  AND u.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."User" existing WHERE existing.id = u.id::text
  );

-- GuardianStudentLink: parents → students → user_profiles → StudentProfile.
INSERT INTO public."GuardianStudentLink" (
  id,
  "tenantId",
  "guardianUserId",
  "studentProfileId",
  "relationshipLabel",
  "consentGrantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'gsl-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  p.tenant_id::text,
  u.id::text,
  sp.id,
  p.relationship,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM public.parents p
JOIN public.students s
  ON s.student_id = p.student_id
 AND s.tenant_id = p.tenant_id
JOIN public.user_profiles up
  ON up.role_specific_id = s.student_id
JOIN public."StudentProfile" sp
  ON sp."userId" = up.user_id::text
 AND sp."tenantId" = p.tenant_id::text
JOIN public.users u
  ON u.tenant_id = p.tenant_id
 AND u.role = 'parent'
 AND (
    (
      p.email IS NOT NULL
      AND btrim(p.email) <> ''
      AND lower(u.email) = lower(btrim(p.email))
    )
    OR (
      (p.email IS NULL OR btrim(p.email) = '')
      AND p.phone IS NOT NULL
      AND u.phone IS NOT NULL
      AND regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(p.phone, '\D', '', 'g')
    )
 )
JOIN public."User" pu ON pu.id = u.id::text
WHERE NOT EXISTS (
  SELECT 1
  FROM public."GuardianStudentLink" g
  WHERE g."guardianUserId" = u.id::text
    AND g."studentProfileId" = sp.id
    AND g."tenantId" = p.tenant_id::text
);
