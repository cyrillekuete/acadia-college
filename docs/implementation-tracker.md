# Acadia College — Implementation Tracker

**Purpose:** Single source of truth for what has been built vs not built. Update this file whenever a feature is started, completed, or blocked.

**Last updated:** 2026-05-16  
**Overall progress:** 1 / 52 features complete (~2%)

### Status legend

| Status | Meaning |
|--------|---------|
| `not_started` | Not yet begun |
| `in_progress` | Actively being implemented |
| `done` | Meets PRD acceptance criteria; merged or verified locally |
| `blocked` | Cannot proceed — note reason in **Notes** |
| `na` | Out of scope / deferred |

---

## How to use (agents & developers)

1. **Before work** — Read this file; pick `not_started` items for the current phase.
2. **When starting** — Set status to `in_progress`; add template source path (§ Template-first).
3. **When done** — Set `done`; fill **Route**, **Template source**, **PR/commit**; bump counts in header.
4. **Each session end** — Update **Last updated** and overall progress line.

---

## Phase 0 — Supabase & Vercel setup

| ID | Feature | Status | Route / artifact | Template source | Notes |
|----|---------|--------|------------------|-----------------|-------|
| P0-01 | Supabase migrations from `database.sql` | `not_started` | `supabase/migrations/` | — | |
| P0-02 | RLS baseline policies | `not_started` | `supabase/migrations/` | — | |
| P0-03 | Seed tenant, roles, test users | `not_started` | `supabase/seed.sql` | — | Acadia College tenant |
| P0-04 | `@supabase/ssr` clients (browser, server, middleware) | `not_started` | `lib/supabase/` | — | |
| P0-05 | Env vars documented (local + Vercel) | `not_started` | `.env.example` | — | |
| P0-06 | Vercel link + `vercel env pull` | `done` | [acadia-college](https://vercel.com) | — | Project linked; add `DATABASE_URL`, `NEXTAUTH_*` in Vercel dashboard |
| P0-07 | GitHub → Vercel preview deploy | `done` | https://acadia-college.vercel.app | — | Production deploy via GitHub + `vercel deploy --prod` |

---

## Phase 1 — Foundation

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-001 | Apply `database.sql` to Supabase | `not_started` | — | — | Same as P0-01 |
| F-002 | Seed Acadia College tenant + users | `not_started` | — | — | Same as P0-03 |
| F-003 | Classic sign-in + Acadia branding | `not_started` | `/signin` | `app/(auth)/signin`, `layouts/classic` | |
| F-004 | Role-based post-login redirect | `not_started` | `/`, `/dashboard/*` | — | `lib/auth/dashboard-routes.ts` |
| F-005 | Admin dashboard | `not_started` | `/dashboard/admin` | TBD — search template dashboard | |
| F-005b | Staff dashboard | `not_started` | `/dashboard/staff` | TBD | |
| F-005c | Student dashboard | `not_started` | `/dashboard/student` | TBD | |
| F-005d | Guardian dashboard | `not_started` | `/dashboard/guardian` | TBD | |
| F-006 | Role-filtered sidebar | `not_started` | `config/menu.config.tsx` | Existing `MENU_SIDEBAR` | |
| F-007 | Acadia branding pass (metadata, header, footer) | `not_started` | `app/layout.tsx`, demo1 header/footer | demo1 components | |
| F-008 | Protected layout + Supabase session guard | `not_started` | `app/(protected)/layout.tsx`, `middleware.ts` | Existing protected layout | |
| F-009 | `use-acadia-college-session` hook | `not_started` | `hooks/` | — | |

---

## Phase 2 — Core registry

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-010 | Students list | `not_started` | `/students` | `user-management/users` | |
| F-011 | Student detail | `not_started` | `/students/[id]` | `account/home/user-profile` | |
| F-012 | Staff list | `not_started` | `/staff` | `user-management/users` | |
| F-012b | Staff detail | `not_started` | `/staff/[id]` | `account/home/user-profile` | |
| F-013 | Academic years | `not_started` | `/academics/years` | TBD — search template | |
| F-013b | Semesters | `not_started` | `/academics/semesters` | TBD | |
| F-013c | Departments | `not_started` | `/academics/departments` | TBD | |
| F-013d | Levels | `not_started` | `/academics/levels` | TBD | |
| F-013e | Specialties | `not_started` | `/academics/specialties` | TBD | |
| F-013f | Rooms | `not_started` | `/academics/rooms` | TBD | |
| F-014 | Courses list | `not_started` | `/courses` | `account/members/teams` | |
| F-014b | Course detail | `not_started` | `/courses/[id]` | TBD | |
| F-015 | Academic calendar milestones | `not_started` | `/academics/calendar` | TBD | P2 |

---

## Phase 3 — Operations

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-020 | Enrollment applications list | `not_started` | `/enrollment/applications` | TBD | |
| F-021 | Student enrollments list | `not_started` | `/enrollment/enrollments` | TBD | |
| F-022 | Attendance sessions + records | `not_started` | `/attendance` | TBD | |
| F-023 | Course marks | `not_started` | `/marks` | TBD | |
| F-024 | Timetable view | `not_started` | `/timetable` | TBD | |
| F-025 | Coursework tasks / submissions | `not_started` | `/coursework` | TBD | P3 |
| F-026 | Exam sessions | `not_started` | `/exams` | TBD | P3 |

---

## Phase 4 — Finance, records, messages

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-030 | Student fees + installments | `not_started` | `/finance/fees` | `account/billing/basic` | |
| F-031 | Scholarships | `not_started` | `/finance/scholarships` | TBD | P3 |
| F-032 | Transcripts | `not_started` | `/transcripts` | TBD | |
| F-032b | Transcript copy requests | `not_started` | `/transcripts/requests` | TBD | |
| F-033 | Messaging | `not_started` | `/messages` | TBD — consider topbar chat pattern | |

---

## Phase 5 — Administration & account (repurposed)

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-040 | Users management | `not_started` | `/admin/users` | `user-management/users` | |
| F-040b | Roles management | `not_started` | `/admin/roles` | `account/members/roles` | |
| F-041 | Institution profile | `not_started` | `/account/home/company-profile` | same path | Tenant data |
| F-042 | System settings | `not_started` | `/account/home/settings-sidebar` | same path | |
| F-043 | User profile | `not_started` | `/account/home/user-profile` | same path | |
| F-043b | Notifications | `not_started` | `/account/notifications` | same path | |
| F-044 | API keys | `not_started` | `/account/api-keys` | same path | P3 |
| F-045 | System log | `not_started` | `/admin/logs` | TBD | |
| F-046 | Get started hub | `not_started` | `/account/home/get-started` | same path | Acadia quick links |

---

## Phase 6 — Cleanup

| ID | Feature | Status | Route / artifact | Template source | Notes |
|----|---------|--------|------------------|-----------------|-------|
| P6-01 | Deprecate NextAuth for Acadia routes | `not_started` | auth routes | — | |
| P6-02 | Remove/isolate Prisma for school data | `not_started` | `prisma/` | — | |
| P6-03 | Tenant logo via Supabase Storage | `not_started` | Storage bucket | — | Optional |

---

## Engineering workstreams (cross-cutting)

| ID | Workstream | Status | Linked todos | Notes |
|----|------------|--------|--------------|-------|
| W-01 | Acadia branding | `not_started` | acadia-branding | |
| W-02 | Supabase foundation | `not_started` | supabase-foundation | |
| W-03 | Auth + dashboards | `not_started` | foundation-auth-dashboard | |
| W-04 | Role routing + middleware | `not_started` | role-based-routing | |
| W-05 | Navigation menu | `not_started` | school-navigation | |
| W-06 | Core lists | `not_started` | core-lists | |
| W-07 | Account pages | `not_started` | repurpose-account | |
| W-08 | Operations modules | `not_started` | operations-modules | |
| W-09 | Vercel + GitHub delivery | `not_started` | vercel-github-delivery | |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-05-16 | — | Initial tracker created; all features `not_started` |
