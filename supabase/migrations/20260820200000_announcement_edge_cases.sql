-- Announcement edge cases: persist targeting, restrict recipient updates,
-- and hide unpublished SchoolAnnouncement rows from non-staff.

ALTER TABLE public."SchoolAlert"
  ADD COLUMN IF NOT EXISTS "targetKeys" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "academicYearId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SchoolAlert_academicYearId_tenantId_fkey'
  ) THEN
    ALTER TABLE public."SchoolAlert"
      ADD CONSTRAINT "SchoolAlert_academicYearId_tenantId_fkey"
      FOREIGN KEY ("tenantId", "academicYearId")
      REFERENCES public."AcademicYear"("tenantId", id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SchoolAlert_tenant_scheduled_idx"
  ON public."SchoolAlert" ("tenantId", status, "scheduledAt")
  WHERE status = 'SCHEDULED';

-- Guardians may only change readAt on their own recipient row.
CREATE OR REPLACE FUNCTION public.acadia_alert_recipient_guardian_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.acadia_is_staff_or_teacher() THEN
    RETURN NEW;
  END IF;

  IF OLD."guardianUserId" IS DISTINCT FROM auth.uid()::text
     OR NEW."guardianUserId" IS DISTINCT FROM auth.uid()::text THEN
    RAISE EXCEPTION 'Guardians may only update their own announcement receipts';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
     OR NEW."alertId" IS DISTINCT FROM OLD."alertId"
     OR NEW."guardianUserId" IS DISTINCT FROM OLD."guardianUserId"
     OR NEW."studentProfileIds" IS DISTINCT FROM OLD."studentProfileIds"
     OR NEW."notificationId" IS DISTINCT FROM OLD."notificationId"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR NEW."whatsappPhone" IS DISTINCT FROM OLD."whatsappPhone"
     OR NEW."whatsappMessageId" IS DISTINCT FROM OLD."whatsappMessageId"
     OR NEW."whatsappStatus" IS DISTINCT FROM OLD."whatsappStatus"
     OR NEW."whatsappError" IS DISTINCT FROM OLD."whatsappError"
  THEN
    RAISE EXCEPTION 'Guardians may only mark announcements as read';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alert_recipient_guardian_update_guard ON public."SchoolAlertRecipient";
CREATE TRIGGER alert_recipient_guardian_update_guard
  BEFORE UPDATE ON public."SchoolAlertRecipient"
  FOR EACH ROW
  EXECUTE FUNCTION public.acadia_alert_recipient_guardian_update_guard();

DROP POLICY IF EXISTS "SchoolAnnouncement_select_tenant" ON public."SchoolAnnouncement";
CREATE POLICY "SchoolAnnouncement_select_tenant"
  ON public."SchoolAnnouncement"
  FOR SELECT
  TO authenticated
  USING (
    "tenantId" = public.acadia_current_tenant_id()
    AND (
      public.acadia_is_staff_or_teacher()
      OR (
        status = 'PUBLISHED'::public."SchoolAnnouncementStatus"
        AND (
          audience = 'ALL'::public."AnnouncementAudience"
          OR (
            audience = 'STAFF'::public."AnnouncementAudience"
            AND public.acadia_is_staff_or_teacher()
          )
          OR (
            audience = 'STUDENTS'::public."AnnouncementAudience"
            AND public.acadia_is_student()
          )
          OR (
            audience = 'GUARDIANS'::public."AnnouncementAudience"
            AND lower(public.acadia_current_role_slug()) IN ('guardian', 'parent')
          )
        )
      )
    )
  );
