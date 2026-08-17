-- Guardian alerts: compose, class/group targeting, recipient inbox.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAlertPriority') THEN
    CREATE TYPE public."SchoolAlertPriority" AS ENUM (
      'low',
      'normal',
      'high',
      'urgent'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAlertChannel') THEN
    CREATE TYPE public."SchoolAlertChannel" AS ENUM (
      'in_app',
      'email',
      'sms',
      'both'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAlertStatus') THEN
    CREATE TYPE public."SchoolAlertStatus" AS ENUM (
      'DRAFT',
      'SCHEDULED',
      'SENT',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAlertGroupType') THEN
    CREATE TYPE public."SchoolAlertGroupType" AS ENUM ('custom');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."SchoolAlert" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "titleEn" text NOT NULL,
  "titleFr" text NOT NULL,
  "bodyEn" text,
  "bodyFr" text,
  priority public."SchoolAlertPriority" NOT NULL DEFAULT 'normal'::public."SchoolAlertPriority",
  channel public."SchoolAlertChannel" NOT NULL DEFAULT 'in_app'::public."SchoolAlertChannel",
  status public."SchoolAlertStatus" NOT NULL DEFAULT 'DRAFT'::public."SchoolAlertStatus",
  "scheduledAt" timestamp without time zone,
  "sentAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "SchoolAlert_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolAlert_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolAlert_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."SchoolAlertRecipient" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "alertId" text NOT NULL,
  "guardianUserId" text NOT NULL,
  "studentProfileIds" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "notificationId" text,
  "readAt" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAlertRecipient_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolAlertRecipient_alert_guardian_key"
    UNIQUE ("alertId", "guardianUserId"),
  CONSTRAINT "SchoolAlertRecipient_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolAlertRecipient_alertId_fkey"
    FOREIGN KEY ("alertId") REFERENCES public."SchoolAlert"(id) ON DELETE CASCADE,
  CONSTRAINT "SchoolAlertRecipient_guardianUserId_fkey"
    FOREIGN KEY ("guardianUserId") REFERENCES public."User"(id),
  CONSTRAINT "SchoolAlertRecipient_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES public."Notification"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public."SchoolAlertGroup" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  name text NOT NULL,
  description text,
  "groupType" public."SchoolAlertGroupType" NOT NULL DEFAULT 'custom'::public."SchoolAlertGroupType",
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "SchoolAlertGroup_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolAlertGroup_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolAlertGroup_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE TABLE IF NOT EXISTS public."SchoolAlertGroupMember" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  "groupId" text NOT NULL,
  "guardianUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolAlertGroupMember_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolAlertGroupMember_group_guardian_key"
    UNIQUE ("groupId", "guardianUserId"),
  CONSTRAINT "SchoolAlertGroupMember_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolAlertGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES public."SchoolAlertGroup"(id) ON DELETE CASCADE,
  CONSTRAINT "SchoolAlertGroupMember_guardianUserId_fkey"
    FOREIGN KEY ("guardianUserId") REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS "SchoolAlert_tenant_status_idx"
  ON public."SchoolAlert" ("tenantId", status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SchoolAlertRecipient_guardian_idx"
  ON public."SchoolAlertRecipient" ("tenantId", "guardianUserId", "readAt");

CREATE INDEX IF NOT EXISTS "SchoolAlertRecipient_alert_idx"
  ON public."SchoolAlertRecipient" ("alertId");

CREATE INDEX IF NOT EXISTS "SchoolAlertGroup_tenant_idx"
  ON public."SchoolAlertGroup" ("tenantId", name);

CREATE INDEX IF NOT EXISTS "SchoolAlertGroupMember_group_idx"
  ON public."SchoolAlertGroupMember" ("groupId");

ALTER TABLE public."SchoolAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolAlertRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolAlertGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolAlertGroupMember" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SchoolAlert_select" ON public."SchoolAlert";
CREATE POLICY "SchoolAlert_select"
  ON public."SchoolAlert"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR EXISTS (
        SELECT 1
        FROM public."SchoolAlertRecipient" r
        WHERE r."alertId" = "SchoolAlert".id
          AND r."tenantId" = "SchoolAlert"."tenantId"
          AND r."guardianUserId" = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "SchoolAlert_write_staff" ON public."SchoolAlert";
CREATE POLICY "SchoolAlert_write_staff"
  ON public."SchoolAlert"
  FOR ALL
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

DROP POLICY IF EXISTS "SchoolAlertRecipient_select" ON public."SchoolAlertRecipient";
CREATE POLICY "SchoolAlertRecipient_select"
  ON public."SchoolAlertRecipient"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "guardianUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "SchoolAlertRecipient_insert_staff" ON public."SchoolAlertRecipient";
CREATE POLICY "SchoolAlertRecipient_insert_staff"
  ON public."SchoolAlertRecipient"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

DROP POLICY IF EXISTS "SchoolAlertRecipient_update" ON public."SchoolAlertRecipient";
CREATE POLICY "SchoolAlertRecipient_update"
  ON public."SchoolAlertRecipient"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "guardianUserId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "guardianUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "SchoolAlertGroup_staff" ON public."SchoolAlertGroup";
CREATE POLICY "SchoolAlertGroup_staff"
  ON public."SchoolAlertGroup"
  FOR ALL
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );

DROP POLICY IF EXISTS "SchoolAlertGroupMember_staff" ON public."SchoolAlertGroupMember";
CREATE POLICY "SchoolAlertGroupMember_staff"
  ON public."SchoolAlertGroupMember"
  FOR ALL
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );
