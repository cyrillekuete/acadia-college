-- Multi-role staff duties, discipline scope groups, and individually tracked library loans.
CREATE TABLE IF NOT EXISTS public."UserRoleAssignment" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "roleId" text NOT NULL REFERENCES public."UserRole"(id) ON DELETE CASCADE,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "roleId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserRoleAssignment_one_primary_idx"
  ON public."UserRoleAssignment"("userId") WHERE "isPrimary";
CREATE INDEX IF NOT EXISTS "UserRoleAssignment_role_idx" ON public."UserRoleAssignment"("roleId");

INSERT INTO public."UserRoleAssignment" ("userId", "roleId", "isPrimary")
SELECT id, "roleId", true FROM public."User"
ON CONFLICT ("userId", "roleId") DO UPDATE SET "isPrimary" = true;
CREATE OR REPLACE FUNCTION public.acadia_sync_primary_role_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public."UserRoleAssignment"
  WHERE "userId" = NEW.id AND "roleId" <> NEW."roleId";
  INSERT INTO public."UserRoleAssignment" ("userId", "roleId", "isPrimary")
  VALUES (NEW.id, NEW."roleId", true)
  ON CONFLICT ("userId", "roleId") DO UPDATE SET "isPrimary" = true;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "User_sync_primary_role_assignment"
AFTER INSERT OR UPDATE OF "roleId" ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.acadia_sync_primary_role_assignment();

INSERT INTO public."UserRole" (id, slug, name, description, "isProtected", "isDefault")
VALUES
  ('role-discipline-master', 'discipline-master', 'Discipline Master', 'Attendance and discipline records within assigned classes.', true, false),
  ('role-bursar', 'bursar', 'Bursar / Accountant', 'Full access to school finance.', true, false),
  ('role-library-attendant', 'library-attendant', 'Library Attendant', 'Manage books, copies, and loans.', true, false),
  ('role-secretary', 'secretary', 'Secretary', 'Register and correct student and staff records.', true, false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.acadia_user_has_role(role_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."UserRoleAssignment" a
    JOIN public."UserRole" r ON r.id = a."roleId"
    JOIN public."User" u ON u.id = a."userId"
    WHERE a."userId" = auth.uid()::text AND lower(r.slug) = lower(role_name)
      AND NOT r."isTrashed" AND NOT u."isTrashed"
  ) OR lower(public.acadia_current_role_slug()) = lower(role_name);
$$;
GRANT EXECUTE ON FUNCTION public.acadia_user_has_role(text) TO authenticated;

-- Bursar has finance authority, but is no longer an administrator/registry manager.
CREATE OR REPLACE FUNCTION public.acadia_is_registry_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(public.acadia_current_role_slug()) IN ('admin','super-admin','financial-director','registrar')
    OR public.acadia_user_has_role('admin') OR public.acadia_user_has_role('super-admin')
    OR public.acadia_user_has_role('financial-director') OR public.acadia_user_has_role('registrar');
$$;
CREATE OR REPLACE FUNCTION public.acadia_can_manage_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.acadia_is_registry_admin() OR public.acadia_user_has_role('bursar');
$$;
GRANT EXECUTE ON FUNCTION public.acadia_can_manage_finance() TO authenticated;

-- Replace admin-only write predicates on finance tables with the finance role predicate.
DO $$
DECLARE
  p record;
  policy_sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'SpecialtyFeePlan','StreamFeePlan','StreamFeePlanClass','StudentFeeAccount',
        'StudentFeeInstallment','StudentScholarship','ScholarshipType','FinanceSale',
        'Expenditure','FinanceLedgerEntry','FinanceBudgetLine'
      ])
      AND (COALESCE(qual, '') LIKE '%acadia_is_admin_or_registrar%'
        OR COALESCE(with_check, '') LIKE '%acadia_is_admin_or_registrar%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    policy_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename, lower(p.permissive), p.cmd,
      array_to_string(p.roles, ', '));
    IF p.qual IS NOT NULL THEN
      policy_sql := policy_sql || ' USING (' || replace(p.qual,
        'public.acadia_is_admin_or_registrar()', 'public.acadia_can_manage_finance()') || ')';
    END IF;
    IF p.with_check IS NOT NULL THEN
      policy_sql := policy_sql || ' WITH CHECK (' || replace(p.with_check,
        'public.acadia_is_admin_or_registrar()', 'public.acadia_can_manage_finance()') || ')';
    END IF;
    EXECUTE policy_sql;
  END LOOP;
END $$;

-- These finance RPCs enforce authorization inside their SECURITY INVOKER bodies too.
DO $$
BEGIN
  EXECUTE replace(
    pg_get_functiondef('public.acadia_apply_fee_installment_updates(text,jsonb)'::regprocedure),
    'public.acadia_is_admin_or_registrar()',
    'public.acadia_can_manage_finance()'
  );
  EXECUTE replace(
    pg_get_functiondef('public.acadia_replace_fee_installments(text,text,integer,integer,text,text,text,jsonb)'::regprocedure),
    'public.acadia_is_admin_or_registrar()',
    'public.acadia_can_manage_finance()'
  );
END $$;

CREATE TABLE IF NOT EXISTS public."DisciplineScopeGroup" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "staffUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "wholeSchool" boolean NOT NULL DEFAULT false,
  "subSystem" public."AcademicSubSystem",
  branch public."AcademicBranch",
  "minLevel" integer,
  "maxLevel" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK (("minLevel" IS NULL) = ("maxLevel" IS NULL)),
  CHECK ("minLevel" IS NULL OR "minLevel" <= "maxLevel")
);
CREATE TABLE IF NOT EXISTS public."DisciplineScopeClass" (
  "scopeGroupId" text NOT NULL REFERENCES public."DisciplineScopeGroup"(id) ON DELETE CASCADE,
  "classId" text NOT NULL REFERENCES public."Class"(id) ON DELETE CASCADE,
  PRIMARY KEY ("scopeGroupId", "classId")
);
CREATE INDEX IF NOT EXISTS "DisciplineScopeGroup_staff_idx" ON public."DisciplineScopeGroup"("staffUserId", "tenantId");

CREATE OR REPLACE FUNCTION public.acadia_discipline_can_access_class(class_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.acadia_is_registry_admin() OR (
    public.acadia_user_has_role('discipline-master') AND EXISTS (
      SELECT 1 FROM public."Class" c
      JOIN public."Level" l ON l.id = c."levelId" AND l."tenantId" = c."tenantId"
      JOIN public."DisciplineScopeGroup" g ON g."staffUserId" = auth.uid()::text AND g."tenantId" = c."tenantId"
      WHERE c.id = class_id AND (
        g."wholeSchool" OR (
          (g."subSystem" IS NOT NULL OR g.branch IS NOT NULL OR g."minLevel" IS NOT NULL
            OR EXISTS (SELECT 1 FROM public."DisciplineScopeClass" sc WHERE sc."scopeGroupId" = g.id)) AND
          (g."subSystem" IS NULL OR g."subSystem" = c."subSystem") AND
          (g.branch IS NULL OR g.branch = c.branch) AND
          (g."minLevel" IS NULL OR l.number BETWEEN g."minLevel" AND g."maxLevel") AND
          (NOT EXISTS (SELECT 1 FROM public."DisciplineScopeClass" sc WHERE sc."scopeGroupId" = g.id)
            OR EXISTS (SELECT 1 FROM public."DisciplineScopeClass" sc WHERE sc."scopeGroupId" = g.id AND sc."classId" = c.id))
        )
      )
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.acadia_discipline_can_access_class(text) TO authenticated;
CREATE POLICY "Class_discipline_scope_select" ON public."Class" FOR SELECT TO authenticated
USING (public.acadia_discipline_can_access_class(id));

DROP POLICY IF EXISTS "StudentTermDiscipline_select_tenant" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_select_tenant" ON public."StudentTermDiscipline" FOR SELECT TO authenticated
USING ("tenantId" = public.acadia_current_tenant_id() AND (
  public.acadia_is_staff_or_teacher()
  OR (public.acadia_user_has_role('discipline-master') AND public.acadia_discipline_can_access_class("classId"))
  OR "studentProfileId" = public.acadia_current_student_profile_id()
  OR public.acadia_is_linked_guardian_of("studentProfileId")
));
DROP POLICY IF EXISTS "StudentTermDiscipline_insert_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_insert_class_master" ON public."StudentTermDiscipline" FOR INSERT TO authenticated
WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND (
  public.acadia_is_admin_or_registrar() OR public.acadia_discipline_can_access_class("classId")
  OR EXISTS (SELECT 1 FROM public."Class" c WHERE c.id = "StudentTermDiscipline"."classId"
    AND c."tenantId" = "StudentTermDiscipline"."tenantId" AND c."staffProfileId" = public.acadia_current_staff_profile_id())
) AND EXISTS (SELECT 1 FROM public."StudentEnrollment" e
  WHERE e."tenantId" = "StudentTermDiscipline"."tenantId"
    AND e."academicYearId" = "StudentTermDiscipline"."academicYearId"
    AND e."classId" = "StudentTermDiscipline"."classId"
    AND e."studentProfileId" = "StudentTermDiscipline"."studentProfileId" AND e.status = 'ENROLLED'));
DROP POLICY IF EXISTS "StudentTermDiscipline_update_class_master" ON public."StudentTermDiscipline";
CREATE POLICY "StudentTermDiscipline_update_class_master" ON public."StudentTermDiscipline" FOR UPDATE TO authenticated
USING ("tenantId" = public.acadia_current_tenant_id() AND (
  public.acadia_is_admin_or_registrar() OR public.acadia_discipline_can_access_class("classId")
  OR EXISTS (SELECT 1 FROM public."Class" c WHERE c.id = "StudentTermDiscipline"."classId"
    AND c."tenantId" = "StudentTermDiscipline"."tenantId" AND c."staffProfileId" = public.acadia_current_staff_profile_id())
))
WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND (
  public.acadia_is_admin_or_registrar() OR public.acadia_discipline_can_access_class("classId")
  OR EXISTS (SELECT 1 FROM public."Class" c WHERE c.id = "StudentTermDiscipline"."classId"
    AND c."tenantId" = "StudentTermDiscipline"."tenantId" AND c."staffProfileId" = public.acadia_current_staff_profile_id())
) AND EXISTS (SELECT 1 FROM public."StudentEnrollment" e
  WHERE e."tenantId" = "StudentTermDiscipline"."tenantId"
    AND e."academicYearId" = "StudentTermDiscipline"."academicYearId"
    AND e."classId" = "StudentTermDiscipline"."classId"
    AND e."studentProfileId" = "StudentTermDiscipline"."studentProfileId" AND e.status = 'ENROLLED'));

-- Discipline Masters can access attendance only for classes matching their scopes.
CREATE OR REPLACE FUNCTION public.acadia_attendance_session_discipline_access(session_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public."AttendanceSession" s
    WHERE s.id = session_id AND s."tenantId" = public.acadia_current_tenant_id()
      AND s."classId" IS NOT NULL AND public.acadia_discipline_can_access_class(s."classId"));
$$;
GRANT EXECUTE ON FUNCTION public.acadia_attendance_session_discipline_access(text) TO authenticated;
CREATE POLICY "attendance_session_discipline_scope" ON public."AttendanceSession" FOR ALL TO authenticated
USING ("tenantId" = public.acadia_current_tenant_id() AND "classId" IS NOT NULL
  AND public.acadia_discipline_can_access_class("classId"))
WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND "classId" IS NOT NULL
  AND public.acadia_discipline_can_access_class("classId"));
CREATE POLICY "attendance_record_discipline_scope" ON public."AttendanceRecord" FOR ALL TO authenticated
USING ("tenantId" = public.acadia_current_tenant_id()
  AND public.acadia_attendance_session_discipline_access("attendanceSessionId"))
WITH CHECK ("tenantId" = public.acadia_current_tenant_id()
  AND public.acadia_attendance_session_discipline_access("attendanceSessionId"));

CREATE TABLE IF NOT EXISTS public."LibraryBook" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "legacyResourceId" text,
  title text NOT NULL,
  author text,
  isbn text,
  category text,
  location text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "legacyResourceId")
);
CREATE TABLE IF NOT EXISTS public."LibraryBookCopy" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "bookId" text NOT NULL REFERENCES public."LibraryBook"(id) ON DELETE CASCADE,
  accession text NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','LOANED','LOST','WITHDRAWN')),
  UNIQUE ("tenantId", accession)
);
CREATE TABLE IF NOT EXISTS public."LibraryLoan" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" text NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "copyId" text NOT NULL REFERENCES public."LibraryBookCopy"(id),
  "borrowerUserId" text NOT NULL REFERENCES public."User"(id),
  "checkedOutByUserId" text NOT NULL REFERENCES public."User"(id),
  "checkedOutAt" timestamptz NOT NULL DEFAULT now(),
  "dueAt" timestamptz NOT NULL,
  "returnedAt" timestamptz,
  "renewalCount" integer NOT NULL DEFAULT 0 CHECK ("renewalCount" >= 0)
);
ALTER TABLE public."LibraryBook" ADD CONSTRAINT "LibraryBook_tenant_id_key" UNIQUE ("tenantId", id);
ALTER TABLE public."LibraryBookCopy" ADD CONSTRAINT "LibraryBookCopy_tenant_id_key" UNIQUE ("tenantId", id);
ALTER TABLE public."LibraryBookCopy" ADD CONSTRAINT "LibraryBookCopy_tenant_book_fkey"
  FOREIGN KEY ("tenantId", "bookId") REFERENCES public."LibraryBook"("tenantId", id) ON DELETE CASCADE;
ALTER TABLE public."LibraryLoan" ADD CONSTRAINT "LibraryLoan_tenant_copy_fkey"
  FOREIGN KEY ("tenantId", "copyId") REFERENCES public."LibraryBookCopy"("tenantId", id);
CREATE OR REPLACE FUNCTION public.acadia_library_loan_tenant_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."User" u WHERE u.id = NEW."borrowerUserId" AND u."tenantId" = NEW."tenantId")
    OR NOT EXISTS (SELECT 1 FROM public."User" u WHERE u.id = NEW."checkedOutByUserId" AND u."tenantId" = NEW."tenantId") THEN
    RAISE EXCEPTION 'Library borrowers and staff must belong to the loan tenant.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "LibraryLoan_tenant_guard" BEFORE INSERT OR UPDATE ON public."LibraryLoan"
FOR EACH ROW EXECUTE FUNCTION public.acadia_library_loan_tenant_guard();
CREATE UNIQUE INDEX IF NOT EXISTS "LibraryLoan_active_copy_idx" ON public."LibraryLoan"("copyId") WHERE "returnedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "LibraryLoan_borrower_idx" ON public."LibraryLoan"("borrowerUserId", "checkedOutAt" DESC);

-- Preserve legacy inventory quantities and active allocated quantities as separate copies/loans.
INSERT INTO public."LibraryBook" ("tenantId", "legacyResourceId", title, location)
SELECT r."tenantId", r.id, COALESCE(NULLIF(r."nameEn", ''), r.code), r.location
FROM public."SchoolResource" r WHERE r."resourceType" = 'BOOK'
ON CONFLICT ("tenantId", "legacyResourceId") DO NOTHING;
INSERT INTO public."LibraryBookCopy" ("tenantId", "bookId", accession, status)
SELECT b."tenantId", b.id, r.code || '-' || n.num,
  CASE WHEN n.num <= COALESCE((
    SELECT sum(a.quantity) FROM public."ResourceAllocation" a
    WHERE a."resourceId" = r.id AND a.status IN ('ACTIVE','OVERDUE')
  ), 0) THEN 'LOANED' ELSE 'AVAILABLE' END
FROM public."SchoolResource" r
JOIN public."LibraryBook" b ON b."tenantId" = r."tenantId" AND b."legacyResourceId" = r.id
CROSS JOIN LATERAL generate_series(1, r."totalQuantity") AS n(num)
ON CONFLICT ("tenantId", accession) DO NOTHING;
INSERT INTO public."LibraryLoan" ("tenantId", "copyId", "borrowerUserId", "checkedOutByUserId", "checkedOutAt", "dueAt")
SELECT a."tenantId", c.id, a."allocatedToUserId", a."createdByUserId",
  a."allocatedOn"::timestamptz,
  COALESCE(a."expectedReturnOn"::timestamptz, a."allocatedOn"::timestamptz + interval '14 days')
FROM public."ResourceAllocation" a
JOIN public."SchoolResource" r ON r.id = a."resourceId" AND r."resourceType" = 'BOOK'
JOIN public."LibraryBook" b ON b."legacyResourceId" = r.id AND b."tenantId" = r."tenantId"
JOIN LATERAL generate_series(1, a.quantity) AS unit(n) ON true
JOIN public."LibraryBookCopy" c
  ON c."bookId" = b.id
  AND c.accession = r.code || '-' || (
    unit.n + COALESCE((
      SELECT sum(previous.quantity) FROM public."ResourceAllocation" previous
      WHERE previous."resourceId" = a."resourceId"
        AND previous.status IN ('ACTIVE','OVERDUE')
        AND (previous."createdAt", previous.id) < (a."createdAt", a.id)
    ), 0)
  )::text
WHERE a.status IN ('ACTIVE','OVERDUE')
  AND NOT EXISTS (SELECT 1 FROM public."LibraryLoan" l WHERE l."copyId" = c.id AND l."returnedAt" IS NULL);

ALTER TABLE public."UserRoleAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DisciplineScopeGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DisciplineScopeClass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LibraryBook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LibraryBookCopy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LibraryLoan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_assignments_self_read" ON public."UserRoleAssignment" FOR SELECT TO authenticated
  USING ("userId" = auth.uid()::text OR public.acadia_is_registry_admin());
CREATE POLICY "role_assignments_admin_write" ON public."UserRoleAssignment" FOR ALL TO authenticated
  USING (public.acadia_is_registry_admin()) WITH CHECK (public.acadia_is_registry_admin());
CREATE POLICY "discipline_scope_staff_read" ON public."DisciplineScopeGroup" FOR SELECT TO authenticated USING
  ("staffUserId" = auth.uid()::text OR public.acadia_is_registry_admin());
CREATE POLICY "discipline_scope_admin_write" ON public."DisciplineScopeGroup" FOR ALL TO authenticated
  USING (public.acadia_is_registry_admin()) WITH CHECK (public.acadia_is_registry_admin());
CREATE POLICY "discipline_scope_class_read" ON public."DisciplineScopeClass" FOR SELECT TO authenticated USING
  (EXISTS (SELECT 1 FROM public."DisciplineScopeGroup" g WHERE g.id = "scopeGroupId" AND (g."staffUserId" = auth.uid()::text OR public.acadia_is_registry_admin())));
CREATE POLICY "discipline_scope_class_admin_write" ON public."DisciplineScopeClass" FOR ALL TO authenticated
  USING (public.acadia_is_registry_admin()) WITH CHECK (public.acadia_is_registry_admin());
CREATE POLICY "library_catalog_read" ON public."LibraryBook" FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id());
CREATE POLICY "library_catalog_attendant_write" ON public."LibraryBook" FOR ALL TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')))
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')));
CREATE POLICY "library_copies_read" ON public."LibraryBookCopy" FOR SELECT TO authenticated USING ("tenantId" = public.acadia_current_tenant_id());
CREATE POLICY "library_copies_attendant_write" ON public."LibraryBookCopy" FOR ALL TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')))
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')));
CREATE POLICY "library_loans_borrower_or_staff_read" ON public."LibraryLoan" FOR SELECT TO authenticated USING
  ("tenantId" = public.acadia_current_tenant_id() AND ("borrowerUserId" = auth.uid()::text OR public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')));
CREATE POLICY "library_loans_attendant_write" ON public."LibraryLoan" FOR ALL TO authenticated
  USING ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')))
  WITH CHECK ("tenantId" = public.acadia_current_tenant_id() AND (public.acadia_is_registry_admin() OR public.acadia_user_has_role('library-attendant')));
