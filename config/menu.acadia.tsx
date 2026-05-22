import { type AcadiaMenuConfig, type AcadiaMenuItem } from './types';

export const MENU_ACADIA: AcadiaMenuConfig = [
  {
    title: 'Dashboard',
    icon: 'element-11',
    path: '/',
  },
  { heading: 'Registry' },
  {
    title: 'Students',
    icon: 'users',
    path: '/students',
  },
  {
    title: 'Staff',
    icon: 'teacher',
    path: '/staff',
  },
  { heading: 'Academics' },
  {
    title: 'Academic structure',
    icon: 'bank',
    children: [
      { title: 'Academic years', path: '/academics/years' },
      { title: 'Promotion', path: '/academics/promotion' },
      { title: 'Terms', path: '/academics/terms' },
      { title: 'Sequences', path: '/academics/sequences' },
      { title: 'Levels', path: '/academics/levels' },
      { title: 'Classes', path: '/academics/classes' },
      { title: 'Calendar', path: '/academics/calendar' },
    ],
  },
  {
    title: 'Subjects',
    icon: 'book',
    children: [
      { title: 'Catalog', path: '/subjects' },
      { title: 'Groupings', path: '/subjects/groupings' },
    ],
  },
  {
    title: 'Timetable',
    icon: 'calendar-tick',
    path: '/timetable',
  },
  { heading: 'Operations' },
  {
    title: 'Enrollment',
    icon: 'file-sheet',
    children: [
      { title: 'Applications', path: '/enrollment/applications' },
      { title: 'Enrollments', path: '/enrollment/enrollments' },
      { title: 'Class rosters', path: '/classes' },
    ],
  },
  {
    title: 'Attendance',
    icon: 'calendar-tick',
    children: [
      { title: 'Sessions', path: '/attendance' },
      { title: 'New session', path: '/attendance/sessions/new' },
      { title: 'Reports', path: '/attendance/reports' },
      { title: 'Analytics', path: '/attendance/analytics' },
    ],
  },
  {
    title: 'Marks',
    icon: 'document',
    children: [
      { title: 'All marks', path: '/marks' },
      { title: 'Enter marks', path: '/marks/entry' },
      { title: 'Grade reports', path: '/marks/reports' },
    ],
  },
  {
    title: 'Coursework',
    icon: 'clipboard',
    path: '/coursework',
  },
  {
    title: 'Exams',
    icon: 'check-squared',
    children: [
      { title: 'Exam sessions', path: '/exams' },
      { title: 'New exam', path: '/exams/new' },
      { title: 'Schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Reports',
    icon: 'file-sheet',
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
    icon: 'wallet',
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
    icon: 'document',
    children: [
      { title: 'Transcripts', path: '/transcripts' },
      { title: 'Copy requests', path: '/transcripts/requests' },
    ],
  },
  {
    title: 'Messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
      { title: 'Groups', path: '/messages/groups' },
    ],
  },
  {
    title: 'Announcements',
    icon: 'notification',
    children: [
      { title: 'All announcements', path: '/announcements' },
      { title: 'New announcement', path: '/announcements/new' },
      { title: 'Events', path: '/announcements/events' },
    ],
  },
  {
    title: 'Resources',
    icon: 'folder',
    children: [
      { title: 'Inventory', path: '/resources' },
      { title: 'Learning materials', path: '/resources/materials' },
      { title: 'Requests', path: '/resources/requests' },
    ],
  },
  { heading: 'Administration' },
  {
    title: 'User Management',
    icon: 'security-user',
    children: [
      { title: 'Users', path: '/admin/users' },
      { title: 'Roles', path: '/user-management/roles' },
      { title: 'Permissions', path: '/user-management/permissions' },
      { title: 'Account', path: '/user-management/account' },
      { title: 'Logs', path: '/admin/logs' },
      { title: 'Settings', path: '/user-management/settings' },
    ],
  },
  {
    title: 'Administration',
    icon: 'shield-tick',
    children: [
      { title: 'Promotion', path: '/academics/promotion' },
      { title: 'Data retention', path: '/admin/data-retention' },
      { title: 'API keys', path: '/account/api-keys' },
    ],
  },
  {
    title: 'My account',
    icon: 'setting-2',
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

const STUDENT_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', icon: 'element-11', path: '/' },
  { title: 'My subjects', icon: 'book', path: '/subjects' },
  { title: 'Timetable', icon: 'calendar-tick', path: '/timetable' },
  { title: 'Attendance', icon: 'calendar-tick', path: '/attendance' },
  { title: 'Marks', icon: 'document', path: '/marks' },
  { title: 'Coursework', icon: 'clipboard', path: '/coursework' },
  { title: 'Fees', icon: 'wallet', path: '/finance/fees' },
  {
    title: 'Messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
    ],
  },
  { title: 'Announcements', icon: 'notification', path: '/announcements' },
  { title: 'Learning materials', icon: 'folder', path: '/resources/materials' },
  { title: 'Resource requests', icon: 'folder', path: '/resources/requests' },
  {
    title: 'My account',
    icon: 'setting-2',
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

const STAFF_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', icon: 'element-11', path: '/' },
  { title: 'Students', icon: 'users', path: '/students' },
  { title: 'Subjects', icon: 'book', path: '/subjects' },
  { title: 'Timetable', icon: 'calendar-tick', path: '/timetable' },
  {
    title: 'Attendance',
    icon: 'calendar-tick',
    children: [
      { title: 'Sessions', path: '/attendance' },
      { title: 'New session', path: '/attendance/sessions/new' },
      { title: 'Reports', path: '/attendance/reports' },
    ],
  },
  {
    title: 'Marks',
    icon: 'document',
    children: [
      { title: 'All marks', path: '/marks' },
      { title: 'Enter marks', path: '/marks/entry' },
    ],
  },
  { title: 'Coursework', icon: 'clipboard', path: '/coursework' },
  {
    title: 'Exams',
    icon: 'check-squared',
    children: [
      { title: 'Exam sessions', path: '/exams' },
      { title: 'Schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', path: '/messages' },
      { title: 'New message', path: '/messages/new' },
      { title: 'Groups', path: '/messages/groups' },
    ],
  },
  { title: 'Announcements', icon: 'notification', path: '/announcements' },
  {
    title: 'Resources',
    icon: 'folder',
    children: [
      { title: 'Inventory', path: '/resources' },
      { title: 'Learning materials', path: '/resources/materials' },
      { title: 'Requests', path: '/resources/requests' },
    ],
  },
  {
    title: 'My account',
    icon: 'setting-2',
    children: [{ title: 'Profile', path: '/account/home/user-profile' }],
  },
];

/** Bursar / financial director — finance-focused navigation (PRD §3.3). */
const BURSAR_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', icon: 'element-11', path: '/' },
  { heading: 'Finance & records' },
  {
    title: 'Finance',
    icon: 'wallet',
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
    icon: 'document',
    children: [
      { title: 'Transcripts', path: '/transcripts' },
      { title: 'Copy requests', path: '/transcripts/requests' },
    ],
  },
  { title: 'Students', icon: 'users', path: '/students' },
  { title: 'Messages', icon: 'message-text', path: '/messages' },
  { title: 'Announcements', icon: 'notification', path: '/announcements' },
  {
    title: 'My account',
    icon: 'setting-2',
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Institution', path: '/account/home/company-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

const GUARDIAN_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', icon: 'element-11', path: '/' },
  { title: 'Attendance', icon: 'calendar-tick', path: '/attendance' },
  { title: 'Marks', icon: 'document', path: '/marks' },
  { title: 'Fees', icon: 'wallet', path: '/finance/fees' },
  { title: 'Messages', icon: 'message-text', path: '/messages' },
  { title: 'Announcements', icon: 'notification', path: '/announcements' },
  {
    title: 'My account',
    icon: 'setting-2',
    children: [
      { title: 'Profile', path: '/account/home/user-profile' },
      { title: 'Notifications', path: '/account/notifications' },
    ],
  },
];

export function getMenuForRole(roleSlug: string | null | undefined): AcadiaMenuConfig {
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

type NavbarRoleKey =
  | 'default'
  | 'financial-director'
  | 'student'
  | 'staff'
  | 'guardian';

const NAVBAR_QUICK_LINK_TITLES: Record<NavbarRoleKey, string[]> = {
  default: [
    'Academic structure',
    'Enrollment',
    'Finance',
    'User Management',
  ],
  'financial-director': ['Finance', 'Transcripts', 'Students', 'Messages'],
  student: ['Timetable', 'Marks', 'Fees', 'Messages'],
  staff: ['Students', 'Attendance', 'Marks', 'Exams'],
  guardian: ['Attendance', 'Marks', 'Fees', 'Messages'],
};

function resolveNavbarRoleKey(
  roleSlug: string | null | undefined,
): NavbarRoleKey {
  const slug = roleSlug?.toLowerCase() ?? '';

  if (slug === 'financial-director') {
    return 'financial-director';
  }
  if (slug === 'student') {
    return 'student';
  }
  if (slug === 'lecturer' || slug === 'staff' || slug === 'teacher') {
    return 'staff';
  }
  if (slug === 'guardian' || slug === 'parent') {
    return 'guardian';
  }

  return 'default';
}

export function getNavbarQuickLinksForRole(
  roleSlug: string | null | undefined,
): AcadiaMenuItem[] {
  const menu = getMenuForRole(roleSlug);
  const titles = NAVBAR_QUICK_LINK_TITLES[resolveNavbarRoleKey(roleSlug)];

  return titles
    .map((title) => menu.find((item) => item.title === title))
    .filter((item): item is AcadiaMenuItem => !!item);
}
