/**
 * Builds acadia_college_initial_schema.sql from the live gydbuqwtwolrxzrrksmx schema.
 * Run: node scripts/bootstrap-new-supabase-project.mjs
 * Then apply via Supabase MCP apply_migration or SQL editor.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'supabase', '.temp', 'acadia_college_initial_schema.sql');

// Exported from gydbuqwtwolrxzrrksmx via Supabase MCP execute_sql (2026-05-16)
const ENUMS = `CREATE TYPE "AcademicCalendarMilestoneKind" AS ENUM ('ENROLLMENT_OPEN', 'ENROLLMENT_CLOSE', 'MARK_ENTRY_OPEN', 'MARK_ENTRY_CLOSE', 'INSTRUCTION_START', 'INSTRUCTION_END', 'EXAM_PERIOD_START', 'EXAM_PERIOD_END');
CREATE TYPE "AttendanceRecordStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "CourseworkSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "DataExportJobStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "DeploymentMode" AS ENUM ('CLOUD', 'LAN');
CREATE TYPE "EnrollmentApplicationKind" AS ENUM ('NEW', 'RE_ENROLL');
CREATE TYPE "EnrollmentApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ExamSessionType" AS ENUM ('NORMAL', 'RESIT');
CREATE TYPE "FeeInstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');
CREATE TYPE "GradingMode" AS ENUM ('FRANCOPHONE', 'ANGLOPHONE', 'PER_SPECIALTY');
CREATE TYPE "MarkEntryCalendarPolicy" AS ENUM ('SESSION_DATES_ONLY', 'CALENDAR_AND_SESSION');
CREATE TYPE "MessageGroupScope" AS ENUM ('DEPARTMENT', 'SPECIALTY', 'LEVEL');
CREATE TYPE "MessageThreadKind" AS ENUM ('DIRECT', 'GROUP');
CREATE TYPE "ScholarshipDiscountKind" AS ENUM ('PERCENT_BPS', 'FIXED_MINOR');
CREATE TYPE "SpecialtyGradingSystem" AS ENUM ('FRANCOPHONE', 'ANGLOPHONE');
CREATE TYPE "StaffEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'ADJUNCT', 'VISITING');
CREATE TYPE "StudentEnrollmentStatus" AS ENUM ('ENROLLED', 'WITHDRAWN');
CREATE TYPE "TenantStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "TranscriptCopyRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'REJECTED');
CREATE TYPE "TranscriptVersionStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "UserStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'BLOCKED');`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `-- Auto-generated bootstrap for project acadia-college (mjjulujygiibfndtapud)
-- Source: gydbuqwtwolrxzrrksmx schema export

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

${ENUMS}

-- Tables, constraints, and indexes are applied via Supabase MCP migrations
-- (acadia_college_schema_tables, acadia_college_schema_constraints).
`,
);
console.log(`Wrote ${OUT}`);
