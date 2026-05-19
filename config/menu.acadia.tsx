import {
  Bell,
  Book,
  Building,
  CalendarCheck,
  ClipboardList,
  FileCheck,
  FileText,
  FolderOpen,
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
      { title: 'Promotion', path: '/admin/promotion' },
      { title: 'Terms', path: '/academics/terms' },
      { title: 'Sequences', path: '/academics/sequences' },
      { title: 'Departments', path: '/academics/departments' },
      { title: 'Levels', path: '/academics/levels' },
      { title: 'Specialties', path: '/academics/specialties' },
      { title: 'Rooms', path: '/academics/rooms' },
      { title: 'Room usage', path: '/academics/rooms/usage' },
      { title: 'Room maintenance', path: '/academics/rooms/maintenance' },
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
      { title: 'Class rosters', path: '/classes' },
    ],
  },
  {
    title: 'Attendance',
    icon: CalendarCheck,
    children: [
      { title: 'Sessions', path: '/attendance' },
      { title: 'New session', path: '/attendance/sessions/new' },
      { title: 'Reports', path: '/attendance/reports' },
      { title: 'Analytics', path: '/attendance/analytics' },
    ],
  },
  {
    title: 'Marks',
    icon: ScrollText,
    children: [
      { title: 'All marks', path: '/marks' },
      { title: 'Enter marks', path: '/marks/entry' },
      { title: 'Grade reports', path: '/marks/reports' },
    ],
  },
  {
    title: 'Coursework',
    icon: ClipboardList,
    path: '/coursework',
  },
  {
    title: 'Exams',
    icon: FileCheck,
    children: [
      { title: 'Exam sessions', path: '/exams' },
      { title: 'New exam', path: '/exams/new' },
      { title: 'Schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Reports',
    icon: FileText,
    children: [
      { title: 'Sequence results', path: '/reports/sequence' },
      { title: 'Term report cards', path: '/reports/term' },
      { title: 'Annual summary', path: '/reports/annual' },
      { title: 'Promotion', path: '/reports/promotion' },
    ],
  },
  { heading: 'Finance & records' },
  {
    title: 'Finance',
    icon: Wallet,
    children: [
      { title: 'Student fees', path: '/finance/fees' },
      { title: 'Fee plan setup', path: '/finance/fees/setup' },
      { title: 'Financial reports', path: '/finance/reports' },
      { title: 'Ledger', path: '/finance/ledger' },
      { title: 'Budget', path: '/finance/budget' },
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
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
      { title: 'Groups', path: '/messages/groups' },
    ],
  },
  {
    title: 'Announcements',
    icon: Bell,
    children: [
      { title: 'All announcements', path: '/announcements' },
      { title: 'New announcement', path: '/announcements/new' },
      { title: 'Events', path: '/announcements/events' },
    ],
  },
  {
    title: 'Resources',
    icon: FolderOpen,
    children: [
      { title: 'Inventory', path: '/resources' },
      { title: 'Learning materials', path: '/resources/materials' },
      { title: 'Requests', path: '/resources/requests' },
    ],
  },
  { heading: 'Administration' },
  {
    title: 'Administration',
    icon: Shield,
    children: [
      { title: 'Users', path: '/admin/users' },
      { title: 'Promotion', path: '/admin/promotion' },
      { title: 'Data retention', path: '/admin/data-retention' },
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
  {
    title: 'Messages',
    icon: MessageSquare,
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
    ],
  },
  { title: 'Announcements', icon: Bell, path: '/announcements' },
  { title: 'Learning materials', icon: FolderOpen, path: '/resources/materials' },
  { title: 'Resource requests', icon: FolderOpen, path: '/resources/requests' },
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
  {
    title: 'Attendance',
    icon: CalendarCheck,
    children: [
      { title: 'Sessions', path: '/attendance' },
      { title: 'New session', path: '/attendance/sessions/new' },
      { title: 'Reports', path: '/attendance/reports' },
    ],
  },
  {
    title: 'Marks',
    icon: ScrollText,
    children: [
      { title: 'All marks', path: '/marks' },
      { title: 'Enter marks', path: '/marks/entry' },
    ],
  },
  { title: 'Coursework', icon: ClipboardList, path: '/coursework' },
  {
    title: 'Exams',
    icon: FileCheck,
    children: [
      { title: 'Exam sessions', path: '/exams' },
      { title: 'Schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Messages',
    icon: MessageSquare,
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
      { title: 'Groups', path: '/messages/groups' },
    ],
  },
  { title: 'Announcements', icon: Bell, path: '/announcements' },
  {
    title: 'Resources',
    icon: FolderOpen,
    children: [
      { title: 'Inventory', path: '/resources' },
      { title: 'Learning materials', path: '/resources/materials' },
      { title: 'Requests', path: '/resources/requests' },
    ],
  },
  {
    title: 'My account',
    icon: Settings,
    children: [{ title: 'Profile', path: '/account/home/user-profile' }],
  },
];

/** Bursar / financial director — finance-focused navigation (PRD §3.3). */
const BURSAR_MENU: MenuConfig = [
  { title: 'Dashboard', icon: LayoutGrid, path: '/' },
  { heading: 'Finance & records' },
  {
    title: 'Finance',
    icon: Wallet,
    children: [
      { title: 'Student fees', path: '/finance/fees' },
      { title: 'Fee plan setup', path: '/finance/fees/setup' },
      { title: 'Financial reports', path: '/finance/reports' },
      { title: 'Ledger', path: '/finance/ledger' },
      { title: 'Budget', path: '/finance/budget' },
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
  { title: 'Students', icon: Users, path: '/students' },
  { title: 'Messages', icon: MessageSquare, path: '/messages' },
  { title: 'Announcements', icon: Bell, path: '/announcements' },
  {
    title: 'My account',
    icon: Settings,
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Institution', path: '/account/home/company-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

const GUARDIAN_MENU: MenuConfig = [
  { title: 'Dashboard', icon: LayoutGrid, path: '/' },
  { title: 'Attendance', icon: CalendarCheck, path: '/attendance' },
  { title: 'Marks', icon: ScrollText, path: '/marks' },
  { title: 'Fees', icon: Wallet, path: '/finance/fees' },
  { title: 'Messages', icon: MessageSquare, path: '/messages' },
  { title: 'Announcements', icon: Bell, path: '/announcements' },
  {
    title: 'My account',
    icon: Settings,
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

export function getMenuForRole(roleSlug: string | null | undefined): MenuConfig {
  const slug = roleSlug?.toLowerCase() ?? '';

  if (slug === 'financial-director') {
    return BURSAR_MENU;
  }
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
