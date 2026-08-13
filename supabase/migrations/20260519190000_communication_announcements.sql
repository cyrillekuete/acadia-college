-- Phase 7J: school announcements, messaging RLS for thread members, notification read

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAnnouncementKind') THEN
    CREATE TYPE public."SchoolAnnouncementKind" AS ENUM ('BROADCAST', 'EVENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolAnnouncementStatus') THEN
    CREATE TYPE public."SchoolAnnouncementStatus" AS ENUM (
      'DRAFT',
      'SCHEDULED',
      'PUBLISHED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementAudience') THEN
    CREATE TYPE public."AnnouncementAudience" AS ENUM (
      'ALL',
      'STAFF',
      'STUDENTS',
      'GUARDIANS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."SchoolAnnouncement" (
  id text NOT NULL,
  "tenantId" text NOT NULL,
  kind public."SchoolAnnouncementKind" NOT NULL DEFAULT 'BROADCAST'::public."SchoolAnnouncementKind",
  "titleEn" text NOT NULL,
  "titleFr" text NOT NULL,
  "bodyEn" text,
  "bodyFr" text,
  status public."SchoolAnnouncementStatus" NOT NULL DEFAULT 'DRAFT'::public."SchoolAnnouncementStatus",
  audience public."AnnouncementAudience" NOT NULL DEFAULT 'ALL'::public."AnnouncementAudience",
  "eventStartsAt" timestamp without time zone,
  "eventEndsAt" timestamp without time zone,
  "eventLocation" text,
  "publishAt" timestamp without time zone,
  "publishedAt" timestamp without time zone,
  "createdByUserId" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT "SchoolAnnouncement_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolAnnouncement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id),
  CONSTRAINT "SchoolAnnouncement_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id)
);

CREATE INDEX IF NOT EXISTS "SchoolAnnouncement_tenant_status_idx"
  ON public."SchoolAnnouncement" ("tenantId", status, "publishAt");

ALTER TABLE public."MessageThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MessageThreadMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchoolAnnouncement" ENABLE ROW LEVEL SECURITY;

-- Thread: tenant members can read threads they belong to (or staff sees all in tenant)
DROP POLICY IF EXISTS "message_thread_select_member" ON public."MessageThread";
CREATE POLICY "message_thread_select_member"
  ON public."MessageThread"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR EXISTS (
        SELECT 1
        FROM public."MessageThreadMember" m
        WHERE m."threadId" = "MessageThread".id
          AND m."tenantId" = "MessageThread"."tenantId"
          AND m."userId" = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "message_thread_insert_tenant" ON public."MessageThread";
CREATE POLICY "message_thread_insert_tenant"
  ON public."MessageThread"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "createdByUserId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "message_thread_update_member" ON public."MessageThread";
CREATE POLICY "message_thread_update_member"
  ON public."MessageThread"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR "createdByUserId" = auth.uid()::text
    )
  )
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id());

-- Thread members
DROP POLICY IF EXISTS "message_thread_member_select" ON public."MessageThreadMember";
CREATE POLICY "message_thread_member_select"
  ON public."MessageThreadMember"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "message_thread_member_insert" ON public."MessageThreadMember";
CREATE POLICY "message_thread_member_insert"
  ON public."MessageThreadMember"
  FOR INSERT
  TO authenticated
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id());

-- Messages: members of the thread may send; all tenant users may read messages in their threads
DROP POLICY IF EXISTS "message_write_staff" ON public."Message";
DROP POLICY IF EXISTS "message_insert_thread_member" ON public."Message";
CREATE POLICY "message_insert_thread_member"
  ON public."Message"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "senderUserId" = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public."MessageThreadMember" m
      WHERE m."threadId" = "Message"."threadId"
        AND m."tenantId" = "Message"."tenantId"
        AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "message_select_tenant" ON public."Message";
CREATE POLICY "message_select_thread_member"
  ON public."Message"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR EXISTS (
        SELECT 1
        FROM public."MessageThreadMember" m
        WHERE m."threadId" = "Message"."threadId"
          AND m."tenantId" = "Message"."tenantId"
          AND m."userId" = auth.uid()::text
      )
    )
  );

-- Notifications: users may mark their own as read
DROP POLICY IF EXISTS "notification_update_own" ON public."Notification";
CREATE POLICY "notification_update_own"
  ON public."Notification"
  FOR UPDATE
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  )
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND "userId" = auth.uid()::text
  );

-- Announcements
DROP POLICY IF EXISTS "SchoolAnnouncement_select_tenant" ON public."SchoolAnnouncement";
CREATE POLICY "SchoolAnnouncement_select_tenant"
  ON public."SchoolAnnouncement"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "SchoolAnnouncement_write_staff" ON public."SchoolAnnouncement";
CREATE POLICY "SchoolAnnouncement_write_staff"
  ON public."SchoolAnnouncement"
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
