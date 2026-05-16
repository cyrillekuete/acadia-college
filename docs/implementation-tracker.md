# Acadia College — Implementation Tracker

**Purpose:** Single source of truth for what has been built vs not built. Update this file whenever a feature is started, completed, or blocked.

**Last updated:** 2026-05-16  
**Overall progress:** 38 / 52 features complete (~73%)

### Status legend

| Status | Meaning |
|--------|---------|
| `not_started` | Not yet begun |
| `in_progress` | Actively being implemented |
| `done` | Meets PRD acceptance criteria; merged or verified locally |
| `blocked` | Cannot proceed — note reason in **Notes** |
| `na` | Out of scope / deferred |

---

## Phase 0 — Supabase & Vercel setup

| ID | Feature | Status | Route / artifact | Template source | Notes |
|----|---------|--------|------------------|-----------------|-------|
| P0-01 | Supabase migrations from `database.sql` | `done` | Remote Supabase `gydbuqwtwolrxzrrksmx` | — | Schema already on project |
| P0-02 | RLS baseline policies | `done` | Supabase | — | Most tables RLS on; Tenant/UserRole need tightening |
| P0-03 | Seed tenant, roles, test users | `done` | `supabase/seed.sql`, migration `20260516120000_acadia_college_dev_users.sql` | — | Dev logins: `admin@acadia-college.edu`, `staff@acadia-college.edu`, `student@acadia-college.edu` / `Acadia2026!` |
| P0-04 | `@supabase/ssr` clients (browser, server, middleware) | `done` | `lib/supabase/` | — | |
| P0-05 | Env vars documented (local + Vercel) | `done` | `.env.example` | — | |
| P0-06 | Vercel link + `vercel env pull` | `done` | https://acadia-college.vercel.app | — | Production + Development: `NEXT_PUBLIC_SUPABASE_*`, `NEXTAUTH_URL` |
| P0-07 | GitHub → Vercel preview deploy | `done` | https://github.com/cyrillekuete/acadia-college | — | |

---

## Phase 1 — Foundation

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-001 | Apply `database.sql` to Supabase | `done` | — | — | Remote project |
| F-002 | Seed Acadia College tenant + users | `done` | `supabase/seed.sql` | — | |
| F-003 | Classic sign-in + Acadia branding | `done` | `/signin` | `layouts/classic`, signin | Supabase `signInWithPassword` |
| F-004 | Role-based post-login redirect | `done` | `/`, `/dashboard/*` | — | `lib/auth/dashboard-routes.ts` |
| F-005 | Admin dashboard | `done` | `/dashboard/admin` | Card stat pattern | Live Supabase counts |
| F-005b | Staff dashboard | `done` | `/dashboard/staff` | Card stat pattern | |
| F-005c | Student dashboard | `done` | `/dashboard/student` | Card stat pattern | |
| F-005d | Guardian dashboard | `done` | `/dashboard/guardian` | Card stat pattern | |
| F-006 | Role-filtered sidebar | `done` | `config/menu.acadia.tsx` | demo1 sidebar-menu | `getMenuForRole` |
| F-007 | Acadia branding pass (metadata, header, footer) | `done` | layout, demo1 header/footer | demo1 | |
| F-008 | Protected layout + Supabase session guard | `done` | `app/(protected)/layout.tsx`, `middleware.ts` | — | |
| F-009 | `use-acadia-college-session` hook | `done` | `hooks/use-acadia-college-session.ts` | — | |

---

## Phase 2 — Core registry

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-010 | Students list | `done` | `/students` | user-management/users + DataGrid | `SupabaseTableList` |
| F-011 | Student detail | `not_started` | `/students/[id]` | `account/home/user-profile` | |
| F-012 | Staff list | `done` | `/staff` | user-management/users | |
| F-012b | Staff detail | `not_started` | `/staff/[id]` | `account/home/user-profile` | |
| F-013 | Academic years | `done` | `/academics/years` | DataGrid list | |
| F-013b | Semesters | `done` | `/academics/semesters` | DataGrid list | |
| F-013c | Departments | `done` | `/academics/departments` | DataGrid list | |
| F-013d | Levels | `done` | `/academics/levels` | DataGrid list | |
| F-013e | Specialties | `done` | `/academics/specialties` | DataGrid list | |
| F-013f | Rooms | `done` | `/academics/rooms` | DataGrid list | |
| F-014 | Courses list | `done` | `/courses` | account/members/teams | |
| F-014b | Course detail | `not_started` | `/courses/[id]` | TBD | |
| F-015 | Academic calendar milestones | `done` | `/academics/calendar` | DataGrid list | |

---

## Phase 3 — Operations

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-020 | Enrollment applications list | `done` | `/enrollment/applications` | DataGrid list | |
| F-021 | Student enrollments list | `done` | `/enrollment/enrollments` | DataGrid list | |
| F-022 | Attendance sessions + records | `done` | `/attendance` | DataGrid list | Sessions list |
| F-023 | Course marks | `done` | `/marks` | DataGrid list | |
| F-024 | Timetable view | `done` | `/timetable` | DataGrid list | |
| F-025 | Coursework tasks / submissions | `not_started` | `/coursework` | TBD | P3 |
| F-026 | Exam sessions | `not_started` | `/exams` | TBD | P3 |

---

## Phase 4 — Finance, records, messages

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-030 | Student fees + installments | `done` | `/finance/fees` | account/billing/basic | List view |
| F-031 | Scholarships | `done` | `/finance/scholarships` | DataGrid list | |
| F-032 | Transcripts | `done` | `/transcripts` | DataGrid list | |
| F-032b | Transcript copy requests | `done` | `/transcripts/requests` | DataGrid list | |
| F-033 | Messaging | `done` | `/messages` | DataGrid list | Threads |

---

## Phase 5 — Administration & account (repurposed)

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-040 | Users management | `done` | `/admin/users` | user-management/users | Redirect |
| F-040b | Roles management | `done` | `/admin/roles` | account/members/roles | Redirect |
| F-041 | Institution profile | `in_progress` | `/account/home/company-profile` | same path | UI exists; Supabase Tenant wiring pending |
| F-042 | System settings | `in_progress` | `/account/home/settings-sidebar` | same path | |
| F-043 | User profile | `in_progress` | `/account/home/user-profile` | same path | |
| F-043b | Notifications | `in_progress` | `/account/notifications` | same path | |
| F-044 | API keys | `not_started` | `/account/api-keys` | same path | P3 |
| F-045 | System log | `done` | `/admin/logs` | DataGrid list | |
| F-046 | Get started hub | `done` | `/account/home/get-started` | get-started/options | Acadia quick links |

---

## Phase 6 — Cleanup

| ID | Feature | Status | Route / artifact | Template source | Notes |
|----|---------|--------|------------------|-----------------|-------|
| P6-01 | Deprecate NextAuth for Acadia routes | `done` | protected layout | — | Supabase session; NextAuth kept for legacy APIs |
| P6-02 | Remove/isolate Prisma for school data | `in_progress` | `prisma/` | — | Prisma still used by template APIs |
| P6-03 | Tenant logo via Supabase Storage | `not_started` | Storage bucket | — | Optional |

---

## Engineering workstreams (cross-cutting)

| ID | Workstream | Status | Linked todos | Notes |
|----|------------|--------|--------------|-------|
| W-01 | Acadia branding | `done` | acadia-branding | |
| W-02 | Supabase foundation | `done` | supabase-foundation | |
| W-03 | Auth + dashboards | `done` | foundation-auth-dashboard | |
| W-04 | Role routing + middleware | `done` | role-based-routing | |
| W-05 | Navigation menu | `done` | school-navigation | |
| W-06 | Core lists | `done` | core-lists | Detail pages remain |
| W-07 | Account pages | `in_progress` | repurpose-account | Get-started done |
| W-08 | Operations modules | `done` | operations-modules | Coursework/exams deferred |
| W-09 | Vercel + GitHub delivery | `done` | vercel-github-delivery | |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-05-16 | — | Initial tracker created |
| 2026-05-16 | — | Phase 0–1 foundation, menus, auth, dashboards, module list pages |
