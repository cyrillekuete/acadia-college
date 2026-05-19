import {
  Bell,
  Book,
  Building,
  CalendarCheck,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import { type MenuConfig } from './types';

export const MENU_ACADIA: MenuConfig = [
  {
    title: 'Dashboard',
    icon: LayoutGrid,
    path: '/',
  },
  { heading: 'Registry' },
  {
    title: 'Students',
    icon: Users,
    path: '/students',
  },
  {
    title: 'Staff',
    icon: GraduationCap,
    path: '/staff',
  },
  { heading: 'Academics' },
  {
    title: 'Academic structure',
    icon: Building,
    children: [
      { title: 'Academic years', path: '/academics/years' },
      { title: 'Terms', path: '/academics/terms' },
      { title: 'Sequences', path: '/academics/sequences' },
      { title: 'Departments', path: '/academics/departments' },
      { title: 'Levels', path: '/academics/levels' },
      { title: 'Specialties', path: '/academics/specialties' },
      { title: 'Rooms', path: '/academics/rooms' },
      { title: 'Calendar', path: '/academics/calendar' },
    ],
  },
  {
    title: 'Courses',
    icon: Book,
    path: '/courses',
  },
  {
    title: 'Timetable',
    icon: CalendarCheck,
    path: '/timetable',
  },
  { heading: 'Operations' },
  {
    title: 'Enrollment',
    icon: FileText,
    children: [
      { title: 'Applications', path: '/enrollment/applications' },
      { title: 'Enrollments', path: '/enrollment/enrollments' },
    ],
  },
  {
    title: 'Attendance',
    icon: CalendarCheck,
    path: '/attendance',
  },
  {
    title: 'Marks',
    icon: ScrollText,
    path: '/marks',
  },
  {
    title: 'Coursework',
    icon: ClipboardList,
    path: '/coursework',
  },
  {
    title: 'Exams',
    icon: FileCheck,
    path: '/exams',
  },
  { heading: 'Finance & records' },
  {
    title: 'Finance',
    icon: Wallet,
    children: [
      { title: 'Student fees', path: '/finance/fees' },
      { title: 'Scholarships', path: '/finance/scholarships' },
    ],
  },
  {
    title: 'Transcripts',
    icon: ScrollText,
    children: [
      { title: 'Transcripts', path: '/transcripts' },
      { title: 'Copy requests', path: '/transcripts/requests' },
    ],
  },
  {
    title: 'Messages',
    icon: MessageSquare,
    path: '/messages',
  },
  { heading: 'Administration' },
  {
    title: 'Administration',
    icon: Shield,
    children: [
      { title: 'Users', path: '/admin/users' },
      { title: 'Roles', path: '/admin/roles' },
      { title: 'API keys', path: '/account/api-keys' },
      { title: 'System log', path: '/admin/logs' },
    ],
  },
  {
    title: 'My account',
    icon: Settings,
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Institution', path: '/account/home/company-profile' },
      { title: 'Settings', path: '/account/home/settings-sidebar' },
      { title: 'Notifications', path: '/account/notifications' },
      { title: 'API keys', path: '/account/api-keys' },
      { title: 'Get started', path: '/account/home/get-started' },
    ],
  },
];

const STUDENT_MENU: MenuConfig = [
  { title: 'Dashboard', icon: LayoutGrid, path: '/' },
  { title: 'My courses', icon: Book, path: '/courses' },
  { title: 'Timetable', icon: CalendarCheck, path: '/timetable' },
  { title: 'Attendance', icon: CalendarCheck, path: '/attendance' },
  { title: 'Marks', icon: ScrollText, path: '/marks' },
  { title: 'Coursework', icon: ClipboardList, path: '/coursework' },
  { title: 'Fees', icon: Wallet, path: '/finance/fees' },
  { title: 'Messages', icon: MessageSquare, path: '/messages' },
  {
    title: 'My account',
    icon: Settings,
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

const STAFF_MENU: MenuConfig = [
  { title: 'Dashboard', icon: LayoutGrid, path: '/' },
  { title: 'Students', icon: Users, path: '/students' },
  { title: 'Courses', icon: Book, path: '/courses' },
  { title: 'Timetable', icon: CalendarCheck, path: '/timetable' },
  { title: 'Attendance', icon: CalendarCheck, path: '/attendance' },
  { title: 'Marks', icon: ScrollText, path: '/marks' },
  { title: 'Coursework', icon: ClipboardList, path: '/coursework' },
  { title: 'Exams', icon: FileCheck, path: '/exams' },
  { title: 'Messages', icon: MessageSquare, path: '/messages' },
  {
    title: 'My account',
    icon: Settings,
    children: [{ title: 'Profile', path: '/account/home/user-profile' }],
  },
];

const GUARDIAN_MENU: MenuConfig = [
  { title: 'Dashboard', icon: LayoutGrid, path: '/' },
  { title: 'Attendance', icon: CalendarCheck, path: '/attendance' },
  { title: 'Marks', icon: ScrollText, path: '/marks' },
  { title: 'Fees', icon: Wallet, path: '/finance/fees' },
  { title: 'Messages', icon: MessageSquare, path: '/messages' },
];

export function getMenuForRole(roleSlug: string | null | undefined): MenuConfig {
  const slug = roleSlug?.toLowerCase() ?? '';

  if (slug === 'student') {
    return STUDENT_MENU;
  }
  if (slug === 'lecturer' || slug === 'staff' || slug === 'teacher') {
    return STAFF_MENU;
  }
  if (slug === 'guardian') {
    return GUARDIAN_MENU;
  }

  return MENU_ACADIA;
}
