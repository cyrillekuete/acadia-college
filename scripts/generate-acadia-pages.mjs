import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

const pages = [
  {
    route: 'students',
    title: 'Acadia College — Students',
    desc: 'Student registry from Supabase.',
    table: 'StudentProfile',
    select: 'id, registrationNumber, isActive, createdAt',
    searchKeys: ['registrationNumber'],
    columns: [
      "  { accessorKey: 'registrationNumber', header: 'Matricule' },",
      "  { accessorKey: 'isActive', header: 'Active' },",
      "  { accessorKey: 'createdAt', header: 'Created' },",
    ],
  },
  {
    route: 'staff',
    title: 'Acadia College — Staff',
    desc: 'Staff profiles from Supabase.',
    table: 'StaffProfile',
    select: 'id, staffCode, title, employmentType, isActive',
    searchKeys: ['staffCode', 'title'],
    columns: [
      "  { accessorKey: 'staffCode', header: 'Code' },",
      "  { accessorKey: 'title', header: 'Title' },",
      "  { accessorKey: 'employmentType', header: 'Employment' },",
      "  { accessorKey: 'isActive', header: 'Active' },",
    ],
  },
  {
    route: 'courses',
    title: 'Acadia College — Courses',
    desc: 'Course catalog.',
    table: 'Course',
    select: 'id, code, nameEn, nameFr, credits, hours',
    searchKeys: ['code', 'nameEn', 'nameFr'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
      "  { accessorKey: 'nameFr', header: 'Name (FR)' },",
      "  { accessorKey: 'credits', header: 'Credits' },",
    ],
  },
  {
    route: 'academics/years',
    title: 'Acadia College — Academic years',
    desc: 'Academic year definitions.',
    table: 'AcademicYear',
    select: 'id, label, startsOn, endsOn, isCurrent',
    searchKeys: ['label'],
    columns: [
      "  { accessorKey: 'label', header: 'Label' },",
      "  { accessorKey: 'startsOn', header: 'Starts' },",
      "  { accessorKey: 'endsOn', header: 'Ends' },",
      "  { accessorKey: 'isCurrent', header: 'Current' },",
    ],
  },
  {
    route: 'academics/semesters',
    title: 'Acadia College — Semesters',
    desc: 'Semesters per academic year.',
    table: 'Semester',
    select: 'id, labelEn, labelFr, startsOn, endsOn',
    searchKeys: ['labelEn', 'labelFr'],
    columns: [
      "  { accessorKey: 'labelEn', header: 'Label (EN)' },",
      "  { accessorKey: 'labelFr', header: 'Label (FR)' },",
      "  { accessorKey: 'startsOn', header: 'Starts' },",
    ],
  },
  {
    route: 'academics/departments',
    title: 'Acadia College — Departments',
    desc: 'Academic departments.',
    table: 'Department',
    select: 'id, code, nameEn, nameFr',
    searchKeys: ['code', 'nameEn'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
      "  { accessorKey: 'nameFr', header: 'Name (FR)' },",
    ],
  },
  {
    route: 'academics/levels',
    title: 'Acadia College — Levels',
    desc: 'Study levels.',
    table: 'Level',
    select: 'id, code, nameEn, nameFr, sortOrder',
    searchKeys: ['code', 'nameEn'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
      "  { accessorKey: 'sortOrder', header: 'Order' },",
    ],
  },
  {
    route: 'academics/specialties',
    title: 'Acadia College — Specialties',
    desc: 'Programs and specialties.',
    table: 'Specialty',
    select: 'id, code, nameEn, nameFr',
    searchKeys: ['code', 'nameEn'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
      "  { accessorKey: 'nameFr', header: 'Name (FR)' },",
    ],
  },
  {
    route: 'academics/rooms',
    title: 'Acadia College — Rooms',
    desc: 'Rooms and facilities.',
    table: 'Room',
    select: 'id, code, nameEn, nameFr, capacity',
    searchKeys: ['code', 'nameEn'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
      "  { accessorKey: 'capacity', header: 'Capacity' },",
    ],
  },
  {
    route: 'academics/calendar',
    title: 'Acadia College — Academic calendar',
    desc: 'Calendar milestones.',
    table: 'AcademicCalendarMilestone',
    select: 'id, kind, onDate, labelEn, labelFr',
    searchKeys: ['labelEn', 'kind'],
    columns: [
      "  { accessorKey: 'kind', header: 'Kind' },",
      "  { accessorKey: 'onDate', header: 'Date' },",
      "  { accessorKey: 'labelEn', header: 'Label (EN)' },",
    ],
  },
  {
    route: 'enrollment/applications',
    title: 'Acadia College — Enrollment applications',
    desc: 'Incoming applications.',
    table: 'EnrollmentApplication',
    select: 'id, status, kind, submittedAt',
    searchKeys: ['status', 'kind'],
    columns: [
      "  { accessorKey: 'kind', header: 'Kind' },",
      "  { accessorKey: 'status', header: 'Status' },",
      "  { accessorKey: 'submittedAt', header: 'Submitted' },",
    ],
  },
  {
    route: 'enrollment/enrollments',
    title: 'Acadia College — Student enrollments',
    desc: 'Active enrollments.',
    table: 'StudentEnrollment',
    select: 'id, status, enrolledOn',
    searchKeys: ['status'],
    columns: [
      "  { accessorKey: 'status', header: 'Status' },",
      "  { accessorKey: 'enrolledOn', header: 'Enrolled on' },",
    ],
  },
  {
    route: 'attendance',
    title: 'Acadia College — Attendance',
    desc: 'Attendance sessions.',
    table: 'AttendanceSession',
    select: 'id, sessionDate, label',
    searchKeys: ['label'],
    columns: [
      "  { accessorKey: 'sessionDate', header: 'Date' },",
      "  { accessorKey: 'label', header: 'Label' },",
    ],
  },
  {
    route: 'marks',
    title: 'Acadia College — Marks',
    desc: 'Course marks.',
    table: 'CourseMark',
    select: 'id, score, maxScore, recordedAt',
    searchKeys: [],
    columns: [
      "  { accessorKey: 'score', header: 'Score' },",
      "  { accessorKey: 'maxScore', header: 'Max' },",
      "  { accessorKey: 'recordedAt', header: 'Recorded' },",
    ],
  },
  {
    route: 'timetable',
    title: 'Acadia College — Timetable',
    desc: 'Timetable slots.',
    table: 'TimetableSlot',
    select: 'id, dayOfWeek, startMinutes, endMinutes',
    searchKeys: [],
    columns: [
      "  { accessorKey: 'dayOfWeek', header: 'Day' },",
      "  { accessorKey: 'startMinutes', header: 'Start (min)' },",
      "  { accessorKey: 'endMinutes', header: 'End (min)' },",
    ],
  },
  {
    route: 'finance/fees',
    title: 'Acadia College — Student fees',
    desc: 'Fee accounts and installments.',
    table: 'StudentFeeAccount',
    select: 'id, currency, totalDueMinor, totalPaidMinor',
    searchKeys: [],
    columns: [
      "  { accessorKey: 'currency', header: 'Currency' },",
      "  { accessorKey: 'totalDueMinor', header: 'Due' },",
      "  { accessorKey: 'totalPaidMinor', header: 'Paid' },",
    ],
  },
  {
    route: 'finance/scholarships',
    title: 'Acadia College — Scholarships',
    desc: 'Scholarship types.',
    table: 'ScholarshipType',
    select: 'id, code, nameEn, nameFr',
    searchKeys: ['code', 'nameEn'],
    columns: [
      "  { accessorKey: 'code', header: 'Code' },",
      "  { accessorKey: 'nameEn', header: 'Name (EN)' },",
    ],
  },
  {
    route: 'transcripts',
    title: 'Acadia College — Transcripts',
    desc: 'Issued transcripts.',
    table: 'Transcript',
    select: 'id, issuedAt, language',
    searchKeys: [],
    columns: [
      "  { accessorKey: 'issuedAt', header: 'Issued' },",
      "  { accessorKey: 'language', header: 'Language' },",
    ],
  },
  {
    route: 'transcripts/requests',
    title: 'Acadia College — Transcript requests',
    desc: 'Copy requests.',
    table: 'TranscriptCopyRequest',
    select: 'id, status, requestedAt',
    searchKeys: ['status'],
    columns: [
      "  { accessorKey: 'status', header: 'Status' },",
      "  { accessorKey: 'requestedAt', header: 'Requested' },",
    ],
  },
  {
    route: 'messages',
    title: 'Acadia College — Messages',
    desc: 'Message threads.',
    table: 'MessageThread',
    select: 'id, subject, createdAt',
    searchKeys: ['subject'],
    columns: [
      "  { accessorKey: 'subject', header: 'Subject' },",
      "  { accessorKey: 'createdAt', header: 'Created' },",
    ],
  },
  {
    route: 'admin/logs',
    title: 'Acadia College — System log',
    desc: 'Audit log entries.',
    table: 'SystemLog',
    select: 'id, action, createdAt',
    searchKeys: ['action'],
    columns: [
      "  { accessorKey: 'action', header: 'Action' },",
      "  { accessorKey: 'createdAt', header: 'When' },",
    ],
  },
];

for (const p of pages) {
  const dir = path.join(root, 'app', '(protected)', p.route);
  fs.mkdirSync(dir, { recursive: true });
  const searchKeysStr = p.searchKeys.map((k) => `'${k}'`).join(', ');
  const content = `'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SupabaseTableList } from '@/components/acadia/supabase-table-list';

type Row = Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
${p.columns.join('\n')}
];

export default function Page() {
  return (
    <AcadiaPageShell title="${p.title}" description="${p.desc}">
      <SupabaseTableList
        table="${p.table}"
        title="${p.table}"
        select="${p.select}"
        columns={columns}
        searchKeys={[${searchKeysStr}]}
      />
    </AcadiaPageShell>
  );
}
`;
  fs.writeFileSync(path.join(dir, 'page.tsx'), content);
  console.log('created', p.route);
}

function redirectPageContent(targetPath) {
  return `'use client';

import { ScreenLoader } from '@/components/common/screen-loader';
import { useOnceRedirect } from '@/hooks/use-once-redirect';

export default function Page() {
  useOnceRedirect('${targetPath}');
  return <ScreenLoader />;
}
`;
}

// Admin users -> redirect
const adminUsers = path.join(root, 'app', '(protected)', 'admin', 'users', 'page.tsx');
fs.mkdirSync(path.dirname(adminUsers), { recursive: true });
fs.writeFileSync(adminUsers, redirectPageContent('/user-management/users'));

const adminRoles = path.join(root, 'app', '(protected)', 'admin', 'roles', 'page.tsx');
fs.mkdirSync(path.dirname(adminRoles), { recursive: true });
fs.writeFileSync(adminRoles, redirectPageContent('/account/members/roles'));

console.log('Done');
