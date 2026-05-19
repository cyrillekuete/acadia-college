-- RLS for AcademicCalendarMilestone (calendar admin CRUD in wave 7A)

ALTER TABLE public."AcademicCalendarMilestone" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AcademicCalendarMilestone_select_tenant" ON public."AcademicCalendarMilestone";
CREATE POLICY "AcademicCalendarMilestone_select_tenant" ON public."AcademicCalendarMilestone"
  FOR SELECT TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id());

DROP POLICY IF EXISTS "AcademicCalendarMilestone_insert_admin" ON public."AcademicCalendarMilestone";
CREATE POLICY "AcademicCalendarMilestone_insert_admin" ON public."AcademicCalendarMilestone"
  FOR INSERT TO authenticated
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());

DROP POLICY IF EXISTS "AcademicCalendarMilestone_update_admin" ON public."AcademicCalendarMilestone";
CREATE POLICY "AcademicCalendarMilestone_update_admin" ON public."AcademicCalendarMilestone"
  FOR UPDATE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin())
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());

DROP POLICY IF EXISTS "AcademicCalendarMilestone_delete_admin" ON public."AcademicCalendarMilestone";
CREATE POLICY "AcademicCalendarMilestone_delete_admin" ON public."AcademicCalendarMilestone"
  FOR DELETE TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND public.acadia_is_admin());
