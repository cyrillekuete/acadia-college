-- Academic year viewing context is enforced in the application layer (active year
-- selector + query filters). Tenant RLS remains the security boundary.
--
-- Optional future hardening: set `app.active_academic_year_id` per request via a
-- SECURITY DEFINER RPC and add policies such as:
--   academicYearId = nullif(current_setting('app.active_academic_year_id', true), '')::uuid
-- on year-scoped tables. Not enabled here to avoid breaking existing clients.

comment on table public."AcademicYear" is
  'School years. The app global year switcher filters operational data by academicYearId; isCurrent marks the live year.';
