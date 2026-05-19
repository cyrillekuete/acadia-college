-- Allow staff to create in-app notifications for guardians (attendance alerts)
-- and tenant-scoped read on guardian–student links.

ALTER TABLE public."GuardianStudentLink" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_link_select_tenant" ON public."GuardianStudentLink";
CREATE POLICY "guardian_link_select_tenant"
  ON public."GuardianStudentLink"
  FOR SELECT
  TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "notification_insert_staff" ON public."Notification";
CREATE POLICY "notification_insert_staff"
  ON public."Notification"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "tenantId" = public.acadia_current_tenant_id()
    AND public.acadia_is_staff_or_teacher()
  );
