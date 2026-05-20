/**
 * Static demo staff for list UI (template parity until Supabase list has rows).
 */

import type { StaffListRow } from '@/lib/acadia/staff-registry';

export type DummyStaff = StaffListRow;

type SeedTeacher = {
  name: string;
  email: string;
  avatar: string | null;
  staffCode: string;
  subsystem: string;
  subsystems: string[];
  subjects: string[];
  isActive: boolean;
};

const SEED_TEACHERS: SeedTeacher[] = [
  {
    name: 'Dr. Alice Ngono',
    email: 'alice.ngono@acadia-college.edu',
    avatar: '300-1.png',
    staffCode: 'TCH-001',
    subsystem: 'ENGLISH',
    subsystems: ['ENGLISH'],
    subjects: ['Mathematics', 'Physics'],
    isActive: true,
  },
  {
    name: 'Mr. Paul Mbarga',
    email: 'paul.mbarga@acadia-college.edu',
    avatar: '300-4.png',
    staffCode: 'TCH-002',
    subsystem: 'FRENCH',
    subsystems: ['FRENCH'],
    subjects: ['Français', 'Histoire-Géographie'],
    isActive: true,
  },
  {
    name: 'Mrs. Grace Ewane',
    email: 'grace.ewane@acadia-college.edu',
    avatar: '300-7.png',
    staffCode: 'TCH-003',
    subsystem: 'ENGLISH',
    subsystems: ['ENGLISH'],
    subjects: ['English Language', 'Literature'],
    isActive: true,
  },
  {
    name: 'Mr. Samuel Fouda',
    email: 'samuel.fouda@acadia-college.edu',
    avatar: null,
    staffCode: 'TCH-004',
    subsystem: 'FRENCH',
    subsystems: ['FRENCH'],
    subjects: ['Sciences Physiques'],
    isActive: true,
  },
  {
    name: 'Ms. Diana Tchoumi',
    email: 'diana.tchoumi@acadia-college.edu',
    avatar: '300-9.png',
    staffCode: 'TCH-005',
    subsystem: 'ENGLISH',
    subsystems: ['ENGLISH'],
    subjects: ['Biology', 'Chemistry'],
    isActive: false,
  },
  {
    name: 'Mr. Jean-Pierre Nkoulou',
    email: 'jp.nkoulou@acadia-college.edu',
    avatar: '300-12.png',
    staffCode: 'TCH-006',
    subsystem: 'FRENCH',
    subsystems: ['FRENCH'],
    subjects: ['Philosophie', 'Économie'],
    isActive: true,
  },
  {
    name: 'Mrs. Olivia Harris',
    email: 'olivia.harris@acadia-college.edu',
    avatar: '300-13.png',
    staffCode: 'TCH-007',
    subsystem: 'ENGLISH',
    subsystems: ['ENGLISH'],
    subjects: ['Computer Science'],
    isActive: true,
  },
  {
    name: 'Mr. Daniel Jackson',
    email: 'daniel.jackson@acadia-college.edu',
    avatar: '300-14.png',
    staffCode: 'TCH-008',
    subsystem: 'ENGLISH',
    subsystems: ['ENGLISH', 'FRENCH'],
    subjects: ['Geography', 'Citizenship'],
    isActive: true,
  },
];

const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 3);

export const DUMMY_STAFF: DummyStaff[] = SEED_TEACHERS.map((teacher, index) => ({
  id: `dummy-staff-${index + 1}`,
  staffCode: teacher.staffCode,
  title: 'Teacher',
  employmentType: 'FULL_TIME',
  isActive: teacher.isActive,
  hireDate: weekAgo.toISOString(),
  createdAt: weekAgo.toISOString(),
  departmentId: null,
  departmentName: null,
  name: teacher.name,
  email: teacher.email,
  avatar: teacher.avatar ? `/media/avatars/${teacher.avatar}` : null,
  subsystem: teacher.subsystem,
  subsystems: teacher.subsystems,
  subjects: teacher.subjects,
}));
