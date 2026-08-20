import { canManageUsers, canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { type AcadiaMenuConfig, type AcadiaMenuItem } from './types';

const ACCOUNT_PROFILE: AcadiaMenuItem = {
  title: 'Profile',
  titleKey: 'nav.profile',
  path: '/account/home/user-profile',
};
const ACCOUNT_SECURITY: AcadiaMenuItem = {
  title: 'Security',
  titleKey: 'nav.security',
  path: '/user-management/account/security',
};
const ACCOUNT_NOTIFICATIONS: AcadiaMenuItem = {
  title: 'Notifications',
  titleKey: 'nav.notifications',
  path: '/account/notifications',
};
const ACCOUNT_INSTITUTION: AcadiaMenuItem = {
  title: 'Institution',
  titleKey: 'nav.institution',
  path: '/account/home/company-profile',
};
const ACCOUNT_SETTINGS: AcadiaMenuItem = {
  title: 'Settings',
  titleKey: 'nav.settings',
  path: '/account/home/settings-sidebar',
};
const ACCOUNT_GET_STARTED: AcadiaMenuItem = {
  title: 'Get started',
  titleKey: 'nav.getStarted',
  path: '/account/home/get-started',
};

function buildMyAccountMenu(options?: {
  institution?: boolean;
  settings?: boolean;
  getStarted?: boolean;
}): AcadiaMenuItem {
  const children: AcadiaMenuItem[] = [ACCOUNT_PROFILE];
  if (options?.institution) {
    children.push(ACCOUNT_INSTITUTION);
  }
  if (options?.settings) {
    children.push(ACCOUNT_SETTINGS);
  }
  children.push(ACCOUNT_SECURITY, ACCOUNT_NOTIFICATIONS);
  if (options?.getStarted) {
    children.push(ACCOUNT_GET_STARTED);
  }
  return {
    title: 'My account',
    titleKey: 'nav.myAccount',
    icon: 'setting-2',
    children,
  };
}

export const MENU_ACADIA: AcadiaMenuConfig = [
  {
    title: 'Dashboard',
    titleKey: 'nav.dashboard',
    icon: 'element-11',
    path: '/',
  },
  { heading: 'Registry', headingKey: 'nav.registry' },
  {
    title: 'Students',
    titleKey: 'nav.students',
    icon: 'users',
    children: [
      { title: 'Students', titleKey: 'nav.students', path: '/students' },
      { title: 'Class rosters', titleKey: 'nav.classRosters', path: '/classes' },
    ],
  },
  {
    title: 'Staff',
    titleKey: 'nav.staff',
    icon: 'teacher',
    path: '/staff',
  },
  { heading: 'Academics', headingKey: 'nav.academics' },
  {
    title: 'Academic structure',
    titleKey: 'nav.academicStructure',
    icon: 'bank',
    children: [
      { title: 'Academic years', titleKey: 'nav.academicYears', path: '/academics/years' },
      { title: 'Promotion', titleKey: 'nav.promotion', path: '/academics/promotion' },
      { title: 'Terms', titleKey: 'nav.terms', path: '/academics/terms' },
      { title: 'Sequences', titleKey: 'nav.sequences', path: '/academics/sequences' },
      { title: 'Levels', titleKey: 'nav.levels', path: '/academics/levels' },
      { title: 'Classes', titleKey: 'nav.classes', path: '/academics/classes' },
      { title: 'Calendar', titleKey: 'nav.calendar', path: '/academics/calendar' },
    ],
  },
  {
    title: 'Subjects',
    titleKey: 'nav.subjects',
    icon: 'book',
    children: [
      { title: 'Catalog', titleKey: 'nav.catalog', path: '/subjects' },
      { title: 'Groupings', titleKey: 'nav.groupings', path: '/subjects/groupings' },
      { title: 'Scheme of work', titleKey: 'nav.schemeOfWork', path: '/scheme-of-work' },
    ],
  },
  {
    title: 'Timetable',
    titleKey: 'nav.timetable',
    icon: 'calendar-tick',
    path: '/timetable',
  },
  { heading: 'Operations', headingKey: 'nav.operations' },
  {
    title: 'Attendance',
    titleKey: 'nav.attendance',
    icon: 'calendar-tick',
    children: [
      { title: 'Sessions', titleKey: 'nav.sessions', path: '/attendance' },
      { title: 'New session', titleKey: 'nav.newSession', path: '/attendance/sessions/new' },
      { title: 'Reports', titleKey: 'nav.reports', path: '/attendance/reports' },
      { title: 'Analytics', titleKey: 'nav.analytics', path: '/attendance/analytics' },
    ],
  },
  {
    title: 'Marks',
    titleKey: 'nav.marks',
    icon: 'document',
    children: [
      { title: 'All marks', titleKey: 'nav.allMarks', path: '/marks' },
      { title: 'Enter marks', titleKey: 'nav.enterMarks', path: '/marks/entry' },
      { title: 'Grade reports', titleKey: 'nav.gradeReports', path: '/marks/reports' },
    ],
  },
  {
    title: 'Coursework',
    titleKey: 'nav.coursework',
    icon: 'clipboard',
    path: '/coursework',
  },
  {
    title: 'Exams',
    titleKey: 'nav.exams',
    icon: 'check-squared',
    children: [
      { title: 'Exam sessions', titleKey: 'nav.examSessions', path: '/exams' },
      { title: 'New exam', titleKey: 'nav.newExam', path: '/exams/new' },
      { title: 'Schedule', titleKey: 'nav.schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Reports',
    titleKey: 'nav.reports',
    icon: 'file-sheet',
    children: [
      { title: 'Sequence results', titleKey: 'nav.sequenceResults', path: '/reports/sequence' },
      { title: 'Class report', titleKey: 'nav.classReport', path: '/reports/class' },
      { title: 'Class absences', titleKey: 'nav.classAbsences', path: '/reports/absences' },
      { title: 'Report card templates', titleKey: 'nav.reportCardTemplates', path: '/reports/templates' },
      { title: 'Term report cards', titleKey: 'nav.termReportCards', path: '/reports/term' },
      { title: 'Annual summary', titleKey: 'nav.annualSummary', path: '/reports/annual' },
      { title: 'Promotion', titleKey: 'nav.promotion', path: '/reports/promotion' },
    ],
  },
  { heading: 'Finance & records', headingKey: 'nav.financeRecords' },
  {
    title: 'Finance',
    titleKey: 'nav.finance',
    icon: 'wallet',
    children: [
      { title: 'Student fees', titleKey: 'nav.studentFees', path: '/finance/fees' },
      { title: 'Sales', titleKey: 'nav.sales', path: '/finance/sales' },
      { title: 'Expenditures', titleKey: 'nav.expenditures', path: '/finance/expenditures' },
      { title: 'Fee plan setup', titleKey: 'nav.feePlanSetup', path: '/finance/fees/setup' },
      { title: 'Financial reports', titleKey: 'nav.financialReports', path: '/finance/reports' },
      { title: 'Income & expenses', titleKey: 'nav.ledger', path: '/finance/ledger' },
      { title: 'Budget', titleKey: 'nav.budget', path: '/finance/budget' },
      { title: 'Scholarships', titleKey: 'nav.scholarships', path: '/finance/scholarships' },
    ],
  },
  {
    title: 'Transcripts',
    titleKey: 'nav.transcripts',
    icon: 'document',
    children: [
      { title: 'Transcripts', titleKey: 'nav.transcripts', path: '/transcripts' },
      { title: 'Copy requests', titleKey: 'nav.copyRequests', path: '/transcripts/requests' },
    ],
  },
  {
    title: 'Messages',
    titleKey: 'nav.messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', titleKey: 'nav.inbox', path: '/messages' },
      { title: 'New message', titleKey: 'nav.newMessage', path: '/messages/new' },
      { title: 'Groups', titleKey: 'nav.groups', path: '/messages/groups' },
    ],
  },
  { title: 'Announcements', titleKey: 'nav.announcements', icon: 'notification', path: '/announcements' },
  {
    title: 'Resources',
    titleKey: 'nav.resources',
    icon: 'folder',
    children: [
      { title: 'Inventory', titleKey: 'nav.inventory', path: '/resources' },
      { title: 'Learning materials', titleKey: 'nav.learningMaterials', path: '/resources/materials' },
      { title: 'Requests', titleKey: 'nav.requests', path: '/resources/requests' },
    ],
  },
  { heading: 'Administration', headingKey: 'nav.administration' },
  {
    title: 'User Management',
    titleKey: 'nav.userManagement',
    icon: 'security-user',
    children: [
      { title: 'Users', titleKey: 'nav.users', path: '/admin/users' },
      { title: 'Roles', titleKey: 'nav.roles', path: '/admin/roles' },
      { title: 'Logs', titleKey: 'nav.logs', path: '/admin/logs' },
    ],
  },
  {
    title: 'Administration',
    titleKey: 'nav.administration',
    icon: 'shield-tick',
    children: [
      { title: 'Promotion', titleKey: 'nav.promotion', path: '/academics/promotion' },
      { title: 'Data retention', titleKey: 'nav.dataRetention', path: '/admin/data-retention' },
      { title: 'API keys', titleKey: 'nav.apiKeys', path: '/account/api-keys' },
    ],
  },
  buildMyAccountMenu({ institution: true, settings: true, getStarted: true }),
];

const STUDENT_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', titleKey: 'nav.dashboard', icon: 'element-11', path: '/' },
  { title: 'My subjects', titleKey: 'nav.mySubjects', icon: 'book', path: '/subjects' },
  { title: 'Timetable', titleKey: 'nav.timetable', icon: 'calendar-tick', path: '/timetable' },
  { title: 'Attendance', titleKey: 'nav.attendance', icon: 'calendar-tick', path: '/attendance' },
  { title: 'Marks', titleKey: 'nav.marks', icon: 'document', path: '/marks' },
  { title: 'Coursework', titleKey: 'nav.coursework', icon: 'clipboard', path: '/coursework' },
  { title: 'Scheme of work', titleKey: 'nav.schemeOfWork', icon: 'book', path: '/scheme-of-work' },
  { title: 'Fees', titleKey: 'nav.fees', icon: 'wallet', path: '/finance/my-fees' },
  {
    title: 'Messages',
    titleKey: 'nav.messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', titleKey: 'nav.inbox', path: '/messages' },
      { title: 'New message', titleKey: 'nav.newMessage', path: '/messages/new' },
    ],
  },
  { title: 'Learning materials', titleKey: 'nav.learningMaterials', icon: 'folder', path: '/resources/materials' },
  { title: 'Resource requests', titleKey: 'nav.resourceRequests', icon: 'folder', path: '/resources/requests' },
  buildMyAccountMenu(),
];

const STAFF_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', titleKey: 'nav.dashboard', icon: 'element-11', path: '/' },
  { title: 'Students', titleKey: 'nav.students', icon: 'users', path: '/students' },
  { title: 'Subjects', titleKey: 'nav.subjects', icon: 'book', path: '/subjects' },
  { title: 'Timetable', titleKey: 'nav.timetable', icon: 'calendar-tick', path: '/timetable' },
  {
    title: 'Attendance',
    titleKey: 'nav.attendance',
    icon: 'calendar-tick',
    children: [
      { title: 'Sessions', titleKey: 'nav.sessions', path: '/attendance' },
      { title: 'New session', titleKey: 'nav.newSession', path: '/attendance/sessions/new' },
      { title: 'Reports', titleKey: 'nav.reports', path: '/attendance/reports' },
    ],
  },
  {
    title: 'Marks',
    titleKey: 'nav.marks',
    icon: 'document',
    children: [
      { title: 'All marks', titleKey: 'nav.allMarks', path: '/marks' },
      { title: 'Enter marks', titleKey: 'nav.enterMarks', path: '/marks/entry' },
      { title: 'Grade reports', titleKey: 'nav.gradeReports', path: '/marks/reports' },
    ],
  },
  { title: 'Class report', titleKey: 'nav.classReport', icon: 'file-sheet', path: '/reports/class' },
  { title: 'Sequence results', titleKey: 'nav.sequenceResults', icon: 'file-sheet', path: '/reports/sequence' },
  { title: 'Term report cards', titleKey: 'nav.termReportCards', icon: 'file-sheet', path: '/reports/term' },
  { title: 'Annual summary', titleKey: 'nav.annualSummary', icon: 'file-sheet', path: '/reports/annual' },
  { title: 'Class absences', titleKey: 'nav.classAbsences', icon: 'calendar-tick', path: '/reports/absences' },
  { title: 'Promotion', titleKey: 'nav.promotion', icon: 'file-sheet', path: '/reports/promotion' },
  { title: 'Coursework', titleKey: 'nav.coursework', icon: 'clipboard', path: '/coursework' },
  { title: 'Scheme of work', titleKey: 'nav.schemeOfWork', icon: 'book', path: '/scheme-of-work' },
  {
    title: 'Exams',
    titleKey: 'nav.exams',
    icon: 'check-squared',
    children: [
      { title: 'Exam sessions', titleKey: 'nav.examSessions', path: '/exams' },
      { title: 'Schedule', titleKey: 'nav.schedule', path: '/exams/schedule' },
    ],
  },
  {
    title: 'Messages',
    titleKey: 'nav.messages',
    icon: 'message-text',
    children: [
      { title: 'Inbox', titleKey: 'nav.inbox', path: '/messages' },
      { title: 'New message', titleKey: 'nav.newMessage', path: '/messages/new' },
      { title: 'Groups', titleKey: 'nav.groups', path: '/messages/groups' },
    ],
  },
  { title: 'Announcements', titleKey: 'nav.announcements', icon: 'notification', path: '/announcements' },
  {
    title: 'Resources',
    titleKey: 'nav.resources',
    icon: 'folder',
    children: [
      { title: 'Inventory', titleKey: 'nav.inventory', path: '/resources' },
      { title: 'Learning materials', titleKey: 'nav.learningMaterials', path: '/resources/materials' },
      { title: 'Requests', titleKey: 'nav.requests', path: '/resources/requests' },
    ],
  },
  buildMyAccountMenu(),
];

const BURSAR_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', titleKey: 'nav.dashboard', icon: 'element-11', path: '/' },
  { heading: 'Finance & records', headingKey: 'nav.financeRecords' },
  {
    title: 'Finance',
    titleKey: 'nav.finance',
    icon: 'wallet',
    children: [
      { title: 'Student fees', titleKey: 'nav.studentFees', path: '/finance/fees' },
      { title: 'Sales', titleKey: 'nav.sales', path: '/finance/sales' },
      { title: 'Expenditures', titleKey: 'nav.expenditures', path: '/finance/expenditures' },
      { title: 'Fee plan setup', titleKey: 'nav.feePlanSetup', path: '/finance/fees/setup' },
      { title: 'Financial reports', titleKey: 'nav.financialReports', path: '/finance/reports' },
      { title: 'Income & expenses', titleKey: 'nav.ledger', path: '/finance/ledger' },
      { title: 'Budget', titleKey: 'nav.budget', path: '/finance/budget' },
      { title: 'Scholarships', titleKey: 'nav.scholarships', path: '/finance/scholarships' },
    ],
  },
  {
    title: 'Transcripts',
    titleKey: 'nav.transcripts',
    icon: 'document',
    children: [
      { title: 'Transcripts', titleKey: 'nav.transcripts', path: '/transcripts' },
      { title: 'Copy requests', titleKey: 'nav.copyRequests', path: '/transcripts/requests' },
    ],
  },
  { title: 'Students', titleKey: 'nav.students', icon: 'users', path: '/students' },
  { title: 'Messages', titleKey: 'nav.messages', icon: 'message-text', path: '/messages' },
  { title: 'Announcements', titleKey: 'nav.announcements', icon: 'notification', path: '/announcements' },
  buildMyAccountMenu({ institution: true }),
];

const GUARDIAN_MENU: AcadiaMenuConfig = [
  { title: 'Dashboard', titleKey: 'nav.dashboard', icon: 'element-11', path: '/' },
  { title: 'Attendance', titleKey: 'nav.attendance', icon: 'calendar-tick', path: '/attendance' },
  { title: 'Marks', titleKey: 'nav.marks', icon: 'document', path: '/marks' },
  { title: 'Fees', titleKey: 'nav.fees', icon: 'wallet', path: '/finance/my-fees' },
  { title: 'Messages', titleKey: 'nav.messages', icon: 'message-text', path: '/messages' },
  { title: 'Announcements', titleKey: 'nav.announcements', icon: 'notification', path: '/announcements' },
  buildMyAccountMenu(),
];

function filterUserManagementAdminItems(
  menu: AcadiaMenuConfig,
  roleSlug: string | null | undefined,
): AcadiaMenuConfig {
  return menu
    .map((item) => {
      if (item.titleKey !== 'nav.userManagement' || !item.children) {
        return item;
      }
      if (!canManageUsers(roleSlug)) {
        return null;
      }
      return item;
    })
    .filter((item): item is AcadiaMenuItem => item != null);
}

function filterAdministrationModuleItems(
  menu: AcadiaMenuConfig,
  roleSlug: string | null | undefined,
): AcadiaMenuConfig {
  const canManageAdminOps = canWriteAcademicAdmin(roleSlug);
  return menu
    .map((item) => {
      if (item.titleKey !== 'nav.administration' || item.heading || !item.children) {
        return item;
      }
      const children = item.children.filter((child) => {
        if (
          child.path === '/admin/data-retention' ||
          child.path === '/account/api-keys'
        ) {
          return canManageAdminOps;
        }
        if (child.path === '/academics/promotion') {
          return canManageAdminOps;
        }
        return true;
      });
      if (children.length === 0) {
        return null;
      }
      return { ...item, children };
    })
    .filter((item): item is AcadiaMenuItem => item != null);
}

export function getMenuForRole(roleSlug: string | null | undefined): AcadiaMenuConfig {
  const slug = roleSlug?.toLowerCase() ?? '';

  if (slug === 'bursar') {
    return BURSAR_MENU.filter((item) => item.path !== '/announcements');
  }
  if (slug === 'financial-director') {
    return filterAdministrationModuleItems(
      filterUserManagementAdminItems(MENU_ACADIA, roleSlug),
      roleSlug,
    );
  }
  if (slug === 'student') {
    return STUDENT_MENU;
  }
  if (slug === 'lecturer' || slug === 'staff' || slug === 'teacher') {
    return STAFF_MENU;
  }
  if (slug === 'guardian' || slug === 'parent') {
    return GUARDIAN_MENU;
  }

  return filterAdministrationModuleItems(
    filterUserManagementAdminItems(MENU_ACADIA, roleSlug),
    roleSlug,
  );
}

type NavbarRoleKey =
  | 'default'
  | 'financial-director'
  | 'bursar'
  | 'student'
  | 'staff'
  | 'guardian';

const NAVBAR_QUICK_LINK_KEYS: Record<NavbarRoleKey, string[]> = {
  default: [
    'nav.academicStructure',
    'nav.students',
    'nav.finance',
    'nav.userManagement',
  ],
  'financial-director': ['nav.finance', 'nav.transcripts', 'nav.students', 'nav.messages'],
  bursar: ['nav.finance', 'nav.transcripts', 'nav.students', 'nav.messages'],
  student: ['nav.timetable', 'nav.marks', 'nav.fees', 'nav.messages'],
  staff: ['nav.students', 'nav.attendance', 'nav.marks', 'nav.exams'],
  guardian: ['nav.attendance', 'nav.marks', 'nav.fees', 'nav.messages'],
};

function resolveNavbarRoleKey(
  roleSlug: string | null | undefined,
): NavbarRoleKey {
  const slug = roleSlug?.toLowerCase() ?? '';

  if (slug === 'financial-director') {
    return 'financial-director';
  }
  if (slug === 'bursar') {
    return 'bursar';
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
  const keys = NAVBAR_QUICK_LINK_KEYS[resolveNavbarRoleKey(roleSlug)];

  return keys
    .map((key) => menu.find((item) => item.titleKey === key))
    .filter((item): item is AcadiaMenuItem => !!item);
}
