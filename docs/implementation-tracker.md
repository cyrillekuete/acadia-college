# Acadia College — Implementation Tracker

**Purpose:** Single source of truth for what has been built vs not built. Update this file whenever a feature is started, completed, or blocked.

**Last updated:** 2026-05-19  
**Overall progress:** 129 / 129 features complete (100%) — Phase 7A–7K done

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
| P0-01 | Supabase migrations from `database.sql` | `done` | Remote Supabase `mjjulujygiibfndtapud` (acadia-college) | — | Align `DATABASE_URL` pooler host with same ref (`ca-central-1`) |
| P0-02 | RLS baseline policies | `done` | Supabase | — | Tenant scope + admin writes (`acadia_is_admin`; legacy `registrar` slug still allowed); staff ops, student submissions |
| P0-03 | Seed tenant, roles, test users | `done` | `supabase/seed.sql`, migration `20260516120000_acadia_college_dev_users.sql` | — | Dev logins: `admin@acadia-college.edu`, `staff@acadia-college.edu`, `student@acadia-college.edu` / `Acadia2026!` |
| P0-04 | `@supabase/ssr` clients (browser, server, middleware) | `done` | `lib/supabase/` | — | |
| P0-05 | Env vars documented (local + Vercel) | `done` | `.env.example` | — | |
| P0-06 | Vercel link + `vercel env pull` | `done` | https://acadia-college.vercel.app | — | `NEXT_PUBLIC_SUPABASE_*` → project `mjjulujygiibfndtapud`; update Vercel env + redeploy |
| P0-07 | GitHub → Vercel preview deploy | `done` | https://github.com/cyrillekuete/acadia-college | — | |

---

## Phase 1 — Foundation

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-001 | Apply `database.sql` to Supabase | `done` | — | — | Remote project |
| F-002 | Seed Acadia College tenant + users | `done` | `supabase/seed.sql` | — | |
| F-003 | Classic sign-in + Acadia branding | `done` | `/signin` | `layouts/classic`, signin | Profile gate, `?next=`, remember-me storage, Supabase reset password |
| F-004 | Role-based post-login redirect | `done` | `/`, `/dashboard/*` | — | `lib/auth/dashboard-routes.ts` |
| F-005 | Admin dashboard | `done` | `/dashboard/admin` | Card stat pattern | Live Supabase counts |
| F-005b | Staff dashboard | `done` | `/dashboard/staff` | Card stat pattern | |
| F-005c | Student dashboard | `done` | `/dashboard/student` | Card stat pattern | |
| F-005d | Guardian dashboard | `done` | `/dashboard/guardian` | Card stat pattern | |
| F-006 | Role-filtered sidebar | `done` | `config/menu.acadia.tsx` | demo1 sidebar-menu | `getMenuForRole` |
| F-007 | Acadia branding pass (metadata, header, footer) | `done` | layout, demo1 header/footer | demo1 | |
| F-008 | Protected layout + Supabase session guard | `done` | `app/(protected)/layout.tsx`, `middleware.ts` | — | Server redirect to `/signin?next=`; session error UI |
| F-009 | `use-acadia-college-session` hook | `done` | `hooks/use-acadia-college-session.ts` | — | |

---

## Phase 2 — Core registry

| ID | Feature | Status | Route | Template source | Notes |
|----|---------|--------|-------|-----------------|-------|
| F-010 | Students list | `done` | `/students` | user-management/users + DataGrid | `SupabaseTableList` |
| F-011 | Student detail | `done` | `/students/[id]` | `account/home/user-profile` | Read-only profile cards + User/Specialty/Level joins |
| F-012 | Staff list | `done` | `/staff` | user-management/users | |
| F-012b | Staff detail | `done` | `/staff/[id]` | `account/home/user-profile` | Read-only profile cards + User/Department joins |
| F-013 | Academic years | `done` | `/academics/years` | DataGrid list | |
| F-013b | Terms | `done` | `/academics/terms` | DataGrid list | Cameroon 3 terms per academic year (`Term` table; was Semester) |
| F-013g | Sequences | `done` | `/academics/sequences` | DataGrid list | 6 sequences per year (`AcademicSequence`) |
| F-013c | Departments | `done` | `/academics/departments` | DataGrid list | |
| F-013d | Levels | `done` | `/academics/levels` | DataGrid list | |
| F-013e | Specialties | `done` | `/academics/specialties` | DataGrid list | |
| F-013f | Rooms | `done` | `/academics/rooms` | DataGrid list | |
| F-014 | Courses list | `done` | `/courses` | account/members/teams | |
| F-014b | Course detail | `done` | `/courses/[id]` | `account/home/user-profile` | Read-only course + academic placement cards |
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
| F-025 | Coursework tasks / submissions | `done` | `/coursework` | DataGrid list | Tasks + submissions lists; task/submission detail |
| F-026 | Exam sessions | `done` | `/exams` | DataGrid list | Exam list + detail with course/year/term/sequence |

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
| F-041 | Institution profile | `done` | `/account/home/company-profile` | same path | Live `Tenant` read via `useAcadiaTenant` |
| F-042 | System settings | `done` | `/account/home/settings-sidebar` | same path | Tenant policies + user profile cards |
| F-043 | User profile | `done` | `/account/home/user-profile` | same path | Session + `User` / `UserRole` from Supabase |
| F-043b | Notifications | `done` | `/account/notifications` | same path | `NotificationPreference` + `Notification` lists |
| F-044 | API keys | `done` | `/account/api-keys` | same path | `TenantApiKey` list + detail; `keyHash` never selected |
| F-045 | System log | `done` | `/admin/logs` | DataGrid list | |
| F-046 | Get started hub | `done` | `/account/home/get-started` | get-started/options | Acadia quick links |

---

## Phase 6 — Cleanup

| ID | Feature | Status | Route / artifact | Template source | Notes |
|----|---------|--------|------------------|-----------------|-------|
| P6-01 | Deprecate NextAuth for Acadia routes | `done` | protected layout | — | Supabase session; NextAuth kept for legacy APIs |
| P6-02 | Remove/isolate Prisma for school data | `done` | `prisma/` | — | Acadia routes use Supabase; Prisma limited to NextAuth + `/api/user-management` |
| P6-03 | Tenant logo via Supabase Storage | `done` | Storage bucket | — | `tenant-assets` + `TenantLogoUpload` on institution profile (administrators) |

---

## Phase 7 — Product depth (stakeholder FR catalogue)

Phases 0–6 delivered **read-only list/detail scaffolds**. Phase 7 implements **§10.6 FR-*** requirements from [prd.md](prd.md) and [product-requirements-document.md](product-requirements-document.md). Implement in wave order (7A → 7B → …) where dependencies apply.

### 7A — Calendar & schema baseline

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-050 | Deploy Cameroon `Term` / `AcademicSequence` migrations | — | `done` | `supabase/migrations/20260519120000_*`, `20260519120100_*`, `20260519120200_*` | — | Apply with `supabase db push` on linked project |
| F-051 | Academic year create/edit + set current year | FR-DM-3 | `done` | `/academics/years` | user-management form pattern | Dialog CRUD + set current year action |
| F-052 | Auto-provision 3 terms + 6 sequences on year create | — | `done` | `lib/acadia/academic-calendar.ts` | — | Called on academic year create |
| F-053 | Term admin CRUD (per year) | — | `done` | `/academics/terms` | DataGrid + form | Dialog CRUD; year/level joins in list |
| F-054 | Sequence admin CRUD (per year) | — | `done` | `/academics/sequences` | DataGrid + form | Dialog CRUD; auto term mapping from sequence # |
| F-055 | Calendar milestone create/edit | — | `done` | `/academics/calendar` | DataGrid + form | Dialog CRUD; optional `termId`; RLS in `20260519120200` |

### 7B — Cameroon educational system (§3.2)

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-056 | Schema: English/French sub-system on catalog | FR-2.1.1 | `done` | `20260519130000_cameroon_subsystem_branch.sql` | — | `AcademicSubSystem` on `Specialty`, `EnrollmentApplication` |
| F-057 | Schema: Grammar/Technical/Commercial branch | FR-2.1.2 | `done` | same migration | — | `AcademicBranch` on `Specialty`, `EnrollmentApplication` |
| F-058 | Seed level catalog per sub-system | — | `done` | `20260519130100_cameroon_level_catalog_seed.sql`, `lib/acadia/education-system.ts` | — | 6 specialty streams × 7 levels (EN/FR labels) |
| F-059 | Filter specialties/levels by sub-system + branch | FR-2.1.1, FR-2.1.2 | `done` | `CatalogFilterBar`, academics + enrollment lists | — | Specialties, levels, courses, applications |

### 7C — User management & permissions

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-060 | Create user (Auth + `User` + role) | FR-1.1.1 | `done` | `/admin/users` | user-management/users | `POST /api/acadia/admin/users` + dialog |
| F-061 | Edit user profile and contact | FR-1.1.2 | `done` | `/admin/users/[id]` | user-profile form | `UserEditForm` |
| F-062 | Activate/deactivate user accounts | FR-1.1.3 | `done` | `/admin/users` | — | Status actions + `User.status` |
| F-063 | Admin-triggered password reset | FR-1.1.4 | `done` | `/admin/users` | — | `POST …/reset-password` via service role |
| F-064 | Assign and modify user roles | FR-1.1.5 | `done` | `/admin/users`, `/admin/roles` | account/members/roles | Role select on create/edit |
| F-065 | User activity in system log | FR-1.1.6 | `done` | `/admin/logs` | DataGrid | `SystemLog` + audit on user actions |
| F-066 | Session timeout configuration | FR-1.2.2 | `done` | `Tenant` / settings-sidebar | settings-sidebar | `TenantSessionSettingsForm` + idle guard |
| F-067 | Password policy enforcement | FR-1.2.3 | `done` | Supabase Auth + sign-in | signin | `getPasswordSchema` on admin create + signup |
| F-068 | Bursar (`financial-director`) finance-focused nav | — | `done` | `config/menu.acadia.tsx`, `/dashboard/admin` | — | `BURSAR_MENU` in `getMenuForRole` |
| F-069 | Multi-factor authentication | FR-1.2.4 | `na` | — | — | Deferred; Supabase MFA when prioritized |

### 7D — Enrollment & student lifecycle

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-070 | Enrollment application create/edit | FR-2.1.1, FR-2.1.2, FR-2.1.3 | `done` | `/enrollment/applications/new`, `[id]/edit` | user-management form | `enrollment-schemas.ts`, catalog-filtered specialty/level |
| F-071 | Application approve/reject → enrollment | — | `done` | `/enrollment/applications/[id]` | — | API review route; provisions User + StudentProfile on NEW approve |
| F-072 | Enrollment confirmation (print/PDF) | FR-2.1.4 | `done` | `/enrollment/applications/[id]/confirmation` | — | Print-friendly confirmation view |
| F-073 | Student profile edit | FR-2.2.1 | `done` | `/students/[id]` | user-profile | `StudentEditForm` tab |
| F-074 | Academic progress across terms | FR-2.2.2 | `done` | `/students/[id]` | Card tab | Enrollments + recent marks |
| F-075 | Examination results & certificates on profile | FR-2.2.3 | `done` | `/students/[id]` | Card tab | Exam sessions, transcripts, copy requests |
| F-076 | Student class migration (manual) | FR-2.2.4, FR-DM-2 | `done` | `/students/[id]` | — | `StudentClassMigrationDialog` + enrollment row |

### 7E — Classes, courses, timetable

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-077 | Course create/edit | FR-3.2.1 | `done` | `/courses/new`, `/courses/[id]/edit` | teams form | `course-schemas.ts`, `CourseForm`, term + catalog placement |
| F-078 | CourseAssignment (teacher ↔ course) | FR-3.1.2, FR-3.2.2 | `done` | `/courses/[id]` | — | `CourseAssignmentPanel` CRUD |
| F-079 | Class rosters by year/branch/level | FR-3.1.1, FR-3.1.3 | `done` | `/classes` | DataGrid | Year + catalog + specialty/level filters |
| F-080 | Timetable slot create/edit | FR-3.1.4 | `done` | `/timetable` | DataGrid + form | `TimetableSlotFormDialog` + edit/delete |
| F-081 | Subject-specific resources (course materials) | FR-3.2.3, FR-8.1.1 | `done` | `/courses/[id]` | — | `CourseworkTask` via `CourseMaterialsPanel` |

### 7F — Academic assessment (Cameroon)

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-082 | Marks entry scoped to sequence | FR-4.1.1 | `done` | `/marks/entry` | DataGrid + form | `MarksEntryGrid`, sequence exam session |
| F-083 | Sequence/term averages and rankings | FR-4.1.2 | `done` | `/marks` | — | `MarksAveragesPanel` tab |
| F-084 | Grade reports (export/print) | FR-4.1.3 | `done` | `/marks/reports` | — | Print-friendly `GradeReportView` |
| F-085 | Grade change history / audit | FR-4.1.4 | `done` | `/marks` | — | `MarksAuditPanel` + `SystemLog` events |
| F-086 | Exam session create/edit | FR-4.2.1 | `done` | `/exams/new`, `/exams/[id]/edit` | form | `ExamSessionForm` |
| F-087 | Major exam types (GCE, BEPC, Probatoire, Bac) | FR-4.2.2 | `done` | `/exams` | — | Migration `20260519150000` |
| F-088 | Examination schedules | FR-4.2.3 | `done` | `/exams/schedule` | calendar/list | Sorted exam list |
| F-089 | Examination results processing | FR-4.2.4 | `done` | `/exams/[id]/results` | — | `ExamResultsPanel` + finalize |
| F-090 | Sequence results report | FR-4.3.1 | `done` | `/reports/sequence` | — | `AcademicReportView` |
| F-091 | Term report cards | FR-4.3.2 | `done` | `/reports/term` | — | |
| F-092 | Annual academic summary | FR-4.3.3 | `done` | `/reports/annual` | — | |
| F-093 | Promotion / admission statements | FR-4.3.4 | `done` | `/reports/promotion` | — | Pass ≥ 10 rule |

### 7G — Attendance

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-094 | Attendance session create + daily marks | FR-5.1.1, FR-5.1.2 | `done` | `/attendance/sessions/new`, `/attendance/sessions/[id]` | form | `AttendanceSessionForm`, `AttendanceEntryGrid` |
| F-095 | Attendance reports | FR-5.1.3 | `done` | `/attendance/reports` | — | `AttendanceReportsView` |
| F-096 | Attendance notifications to guardians | FR-5.1.4 | `done` | notifications | account/notifications | In-app `Notification` on absent/late; migration `20260519160000` |
| F-097 | Attendance percentage calculations | FR-5.2.1 | `done` | `/attendance` | — | `AttendancePercentagesPanel` tab |
| F-098 | Attendance pattern analytics | FR-5.2.2 | `done` | `/attendance/analytics` | chart cards | `AttendanceAnalyticsPanel` |
| F-099 | Attendance summaries | FR-5.2.3 | `done` | `/attendance/reports` | — | Student summaries in reports view |

### 7H — Financial management

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-100 | Tuition fee plans / setup | FR-6.1.1 | `done` | `/finance/fees/setup` | account/billing/basic | `FeePlanSetupForm`, `SpecialtyFeePlan` |
| F-101 | Payment status tracking | FR-6.1.2 | `done` | `/finance/fees`, `/finance/fees/[id]` | billing | `FeeAccountInstallments`, status badges |
| F-102 | Invoices and receipts | FR-6.1.3 | `done` | `/finance/fees/[id]/invoice` | — | `FeeInvoiceView` (print) |
| F-103 | Outstanding balances view | FR-6.1.4 | `done` | `/finance/fees` | — | `FeeOutstandingPanel` tab |
| F-104 | Financial summaries | FR-6.2.1 | `done` | `/finance/reports` | dashboard cards | `FinanceSummaryPanel` |
| F-105 | Income and expense tracking | FR-6.2.2 | `done` | `/finance/ledger` | — | `FinanceLedgerEntry` + `FinanceLedgerPanel` |
| F-106 | Budget reports | FR-6.2.3 | `done` | `/finance/budget` | — | `FinanceBudgetLine` + `FinanceBudgetPanel` |
| F-107 | Year-end financial statements | FR-6.2.4 | `done` | `/finance/reports/annual` | — | `FinanceAnnualReport` |

### 7I — Promotion & year rollover

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-108 | Automatic promotion (average ≥ 10) | FR-DM-1 | `done` | `lib/acadia/promotion.ts` | — | `computeAutomaticPromotion`, year averages |
| F-109 | Manual promotion override | FR-DM-2 | `done` | `/admin/promotion` | — | `PromotionAdminPanel`; links F-076 |
| F-110 | Academic year transition / rollover | FR-DM-3 | `done` | `/academics/years/[id]/rollover` | — | `YearRolloverWizard` |
| F-111 | Data archival and retention | FR-DM-4 | `done` | `/admin/data-retention` | — | `TenantDataRetentionPolicy` + archive job |

### 7J — Communication

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-112 | Message compose and reply | FR-7.1.1 | `done` | `/messages/new`, `/messages/[id]` | — | `MessageComposeForm`, `MessageThreadPanel` |
| F-113 | Group messaging | FR-7.1.2 | `done` | `/messages/groups` | — | `MessageGroupForm` |
| F-114 | System notifications and alerts | FR-7.1.3 | `done` | `/account/notifications` | notifications | `NotificationInboxPanel`, mark read |
| F-115 | Communication preferences | FR-7.1.4 | `done` | `/account/notifications` | settings | `NotificationPreferencesForm` CRUD |
| F-116 | School announcements broadcast | FR-7.2.1 | `done` | `/announcements` | — | `SchoolAnnouncement` + `AnnouncementsPanel` |
| F-117 | Event notifications | FR-7.2.2 | `done` | `/announcements/events` | — | Event kind filter |
| F-118 | Announcement scheduling | FR-7.2.3 | `done` | `/announcements`, `/announcements/new` | — | `AnnouncementForm` publish/schedule |

### 7K — Resource management

| ID | Feature | FR | Status | Route / artifact | Template source | Notes |
|----|---------|-----|--------|------------------|-----------------|-------|
| F-119 | Learning materials library | FR-8.1.1 | `done` | `/resources/materials` | — | `LearningMaterial` + `learning-materials` bucket |
| F-120 | Resource allocation tracking | FR-8.1.2 | `done` | `/resources` | — | `ResourceAllocation` + `ResourcesOverviewPanel` |
| F-121 | Resource usage monitoring | FR-8.1.3 | `done` | `/resources` | — | `ResourceUsageLog` tab |
| F-122 | Resource request workflow | FR-8.1.4 | `done` | `/resources/requests` | — | `ResourceRequest` + review workflow |
| F-123 | Classroom assignments | FR-8.2.1 | `done` | `/academics/rooms` | — | `RoomAssignmentsPanel` via `TimetableSlot` |
| F-124 | Facility usage tracking | FR-8.2.2 | `done` | `/academics/rooms/usage` | — | `RoomUsagePanel` |
| F-125 | Maintenance scheduling | FR-8.2.3 | `done` | `/academics/rooms/maintenance` | — | `RoomMaintenanceSchedule` |

### Phase 7 — FR coverage index

| FR ID | Tracker ID(s) | Already partially covered by |
|-------|---------------|------------------------------|
| FR-1.1.1 | F-060 | — |
| FR-1.1.2 | F-061 | F-043 (self profile) |
| FR-1.1.3 | F-062 | — |
| FR-1.1.4 | F-063 | F-003 (self reset) |
| FR-1.1.5 | F-064 | — |
| FR-1.1.6 | F-065 | F-045 (list only) |
| FR-1.2.1 | — | F-003, F-004, F-008 (`done`) |
| FR-1.2.2 | F-066 | F-008 (refresh) |
| FR-1.2.3 | F-067 | F-003 |
| FR-1.2.4 | F-069 | `na` |
| FR-2.1.1 | F-056, F-059, F-070 | — |
| FR-2.1.2 | F-057, F-059, F-070 | — |
| FR-2.1.3 | F-070 | F-020 (list) |
| FR-2.1.4 | F-072 | — |
| FR-2.2.1 | F-073 | F-011 (read-only) |
| FR-2.2.2 | F-074 | — |
| FR-2.2.3 | F-075 | F-026 (exams list) |
| FR-2.2.4 | F-076, F-109 | — |
| FR-3.1.1 | F-079 | — |
| FR-3.1.2 | F-078 | — |
| FR-3.1.3 | F-079 | F-021 (list) |
| FR-3.1.4 | F-080 | F-024 (list) |
| FR-3.2.1 | F-077 | F-014 (list) |
| FR-3.2.2 | F-078 | — |
| FR-3.2.3 | F-081, F-119 | — |
| FR-4.1.1 | F-082 | F-023 (list) |
| FR-4.1.2 | F-083 | — |
| FR-4.1.3 | F-084 | — |
| FR-4.1.4 | F-085 | — |
| FR-4.2.1 | F-086 | F-026 (list + detail) |
| FR-4.2.2 | F-087 | — |
| FR-4.2.3 | F-088 | — |
| FR-4.2.4 | F-089 | — |
| FR-4.3.1 | F-090 | — |
| FR-4.3.2 | F-091 | — |
| FR-4.3.3 | F-092 | — |
| FR-4.3.4 | F-093 | — |
| FR-5.1.1 | F-094 | F-022 (list) |
| FR-5.1.2 | F-094 | — |
| FR-5.1.3 | F-095 | — |
| FR-5.1.4 | F-096 | — |
| FR-5.2.1 | F-097 | — |
| FR-5.2.2 | F-098 | — |
| FR-5.2.3 | F-099 | — |
| FR-6.1.1 | F-100 | F-030 (list) |
| FR-6.1.2 | F-101 | F-030 |
| FR-6.1.3 | F-102 | — |
| FR-6.1.4 | F-103 | — |
| FR-6.2.1 | F-104 | — |
| FR-6.2.2 | F-105 | — |
| FR-6.2.3 | F-106 | — |
| FR-6.2.4 | F-107 | — |
| FR-7.1.1 | F-112 | F-033 (list) |
| FR-7.1.2 | F-113 | — |
| FR-7.1.3 | F-114 | F-043b |
| FR-7.1.4 | F-115 | F-043b |
| FR-7.2.1 | F-116 | — |
| FR-7.2.2 | F-117 | — |
| FR-7.2.3 | F-118 | — |
| FR-8.1.1 | F-119, F-081 | — |
| FR-8.1.2 | F-120 | — |
| FR-8.1.3 | F-121 | — |
| FR-8.1.4 | F-122 | — |
| FR-8.2.1 | F-123 | F-013f, F-024 |
| FR-8.2.2 | F-124 | — |
| FR-8.2.3 | F-125 | — |
| FR-DM-1 | F-108 | — |
| FR-DM-2 | F-109, F-076 | — |
| FR-DM-3 | F-051, F-052, F-110 | F-013 (years list) |
| FR-DM-4 | F-111 | — |

---

## Engineering workstreams (cross-cutting)

| ID | Workstream | Status | Linked todos | Notes |
|----|------------|--------|--------------|-------|
| W-01 | Acadia branding | `done` | acadia-branding | |
| W-02 | Supabase foundation | `done` | supabase-foundation | |
| W-03 | Auth + dashboards | `done` | foundation-auth-dashboard | |
| W-04 | Role routing + middleware | `done` | role-based-routing | |
| W-05 | Navigation menu | `done` | school-navigation | |
| W-06 | Core lists | `done` | core-lists | Lists + student/staff/course detail pages |
| W-07 | Account pages | `done` | repurpose-account | Institution, settings, profile, notifications wired |
| W-08 | Operations modules | `done` | operations-modules | Includes coursework and exams |
| W-09 | Vercel + GitHub delivery | `done` | vercel-github-delivery | |
| W-10 | Phase 7 product depth (FR catalogue) | `done` | F-050–F-125 | 7A–7K complete |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-05-16 | — | Initial tracker created |
| 2026-05-16 | — | Phase 0–1 foundation, menus, auth, dashboards, module list pages |
| 2026-05-16 | — | F-011, F-012b, F-014b detail pages; list → detail links |
| 2026-05-16 | — | F-041–F-043b account pages wired to Supabase Tenant/User/notifications |
| 2026-05-16 | — | F-025 coursework, F-026 exams; nav + detail pages |
| 2026-05-16 | — | F-044 API keys list + detail; admin menu link |
| 2026-05-16 | — | P0-02 RLS, P6-02 Prisma boundary, P6-03 tenant logo; admin users/roles Supabase |
| 2026-05-16 | — | Logo upload UI; role-based RLS writes; sample coursework/exam seed |
| 2026-05-16 | — | Auth hardening: profile gate (`ACTIVE`, tenant, role), middleware `?next=`, Supabase logout/reset, `scripts/manual-auth-smoke.mjs` (local smoke: sign-in page + middleware redirect verified) |
| 2026-05-19 | — | Phase 7 added: F-050–F-125 mapped to PRD §10.6 FR IDs; progress 53/129; FR coverage index |
| 2026-05-19 | — | Phase 7A: migrations + `academic-calendar.ts`; admin CRUD on years/terms/sequences/calendar (F-050–F-055) |
| 2026-05-19 | — | Phase 7B: sub-system/branch schema, level catalog seed, catalog filters (F-056–F-059) |
| 2026-05-19 | — | Phase 7C: user CRUD, password reset, system log, session timeout, bursar menu (F-060–F-068); migration `20260519140000` |
| 2026-05-19 | — | Phase 7D: enrollment application CRUD, approve/reject, confirmation, student profile tabs (F-070–F-076) |
| 2026-05-19 | — | Phase 7E: course CRUD, assignments, class rosters, timetable slots, course materials (F-077–F-081) |
| 2026-05-19 | — | Phase 7F: marks entry, averages, audit, exams CRUD/schedule/results, academic reports (F-082–F-093) |
| 2026-05-19 | — | Phase 7G: attendance sessions, daily marks, reports, analytics, guardian notifications (F-094–F-099) |
| 2026-05-19 | — | Phase 7H: fee plans, payments, invoices, outstanding balances, ledger, budget, annual reports (F-100–F-107) |
| 2026-05-19 | — | Phase 7I: automatic promotion, manual overrides, year rollover, data retention (F-108–F-111) |
| 2026-05-19 | — | Phase 7J: messaging, group threads, notifications, preferences, announcements (F-112–F-118) |
| 2026-05-19 | — | Phase 7K: learning materials, resource inventory/requests, room usage & maintenance (F-119–F-125) |

---

## Auth smoke test (manual)

Run against a running dev server (`npm run dev`; use port shown in terminal, e.g. `SMOKE_BASE_URL=http://localhost:3001`):

```bash
node scripts/manual-auth-smoke.mjs
```

**2026-05-16 local run:** PASS sign-in page; PASS unauthenticated `/students` → `/signin?next=%2Fstudents`. Supabase `signInWithPassword` requires reachable `NEXT_PUBLIC_SUPABASE_URL` (fails with DNS/network errors if the project host is offline or blocked).

**Supabase dashboard:** add redirect URL `{origin}/auth/callback` for password reset (and production URL when deploying).
