/**
 * Static demo students for list/profile UI (template parity until Supabase list is wired).
 */

export type StudentEnrollmentStatus = 'active' | 'pending' | 'inactive';

export type DummyStudent = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  class_name: string;
  matricule_number: string | null;
  enrollment_status: StudentEnrollmentStatus;
  status: 'active' | 'inactive';
  enrollment_date: string;
  email_verified: boolean;
};

const CLASS_NAMES = [
  'Form 4A',
  'Form 4B',
  'Form 5 Science',
  'Lower Sixth Arts',
  'Upper Sixth Commercial',
  'Form 3 Grammar',
] as const;

const ENROLLMENT_STATUSES: StudentEnrollmentStatus[] = [
  'active',
  'active',
  'active',
  'pending',
  'inactive',
];

type SeedUser = {
  name: string;
  email: string;
  avatar: string | null;
};

const SEED_USERS: SeedUser[] = [
  { name: 'John Doe', email: 'john.doe@example.com', avatar: '300-1.png' },
  { name: 'Michael Brown', email: 'michael.brown@example.com', avatar: '300-4.png' },
  { name: 'Jack Ramirez', email: 'jack.ramirez@example.com', avatar: null },
  { name: 'David Miller', email: 'david.miller@example.com', avatar: '300-6.png' },
  { name: 'Laura Garcia', email: 'laura.garcia@example.com', avatar: '300-7.png' },
  { name: 'Robert Wilson', email: 'robert.wilson@example.com', avatar: '300-8.png' },
  { name: 'Sarah Martinez', email: 'sarah.martinez@example.com', avatar: '300-9.png' },
  { name: 'William Anderson', email: 'william.anderson@example.com', avatar: '300-10.png' },
  { name: 'Sophia Thomas', email: 'sophia.thomas@example.com', avatar: '300-11.png' },
  { name: 'Daniel Jackson', email: 'daniel.jackson@example.com', avatar: '300-12.png' },
  { name: 'Olivia Harris', email: 'olivia.harris@example.com', avatar: '300-13.png' },
  { name: 'Matthew Clark', email: 'matthew.clark@example.com', avatar: '300-14.png' },
  { name: 'Ava Rodriguez', email: 'ava.rodriguez@example.com', avatar: '300-15.png' },
  { name: 'James Lewis', email: 'james.lewis@example.com', avatar: '300-16.png' },
  { name: 'Emily Johnson', email: 'emily.johnson@example.com', avatar: '300-3.png' },
  { name: 'Mia Allen', email: 'mia.allen@example.com', avatar: '300-19.png' },
  { name: 'Ethan Young', email: 'ethan.young@example.com', avatar: '300-20.png' },
  { name: 'Charlotte King', email: 'charlotte.king@example.com', avatar: '300-21.png' },
  { name: 'Alexander Wright', email: 'alexander.wright@example.com', avatar: '300-22.png' },
  { name: 'Amelia Scott', email: 'amelia.scott@example.com', avatar: '300-23.png' },
  { name: 'Harper Adams', email: 'harper.adams@example.com', avatar: '300-25.png' },
  { name: 'Christopher Baker', email: 'christopher.baker@example.com', avatar: '300-26.png' },
  { name: 'Grace Nelson', email: 'grace.nelson@example.com', avatar: null },
  { name: 'Henry Carter', email: 'henry.carter@example.com', avatar: null },
  { name: 'Abigail Mitchell', email: 'abigail.mitchell@example.com', avatar: '300-29.png' },
  { name: 'Sofia Turner', email: 'sofia.turner@example.com', avatar: '300-31.png' },
  { name: 'Victoria Campbell', email: 'victoria.campbell@example.com', avatar: '300-33.png' },
  { name: 'Liam Parker', email: 'liam.parker@example.com', avatar: '300-34.png' },
  { name: 'Emma Evans', email: 'emma.evans@example.com', avatar: null },
  { name: 'Noah Rivera', email: 'noah.rivera@example.com', avatar: null },
  { name: 'Benjamin Green', email: 'benjamin.green@example.com', avatar: '300-24.png' },
  { name: 'Avery Morris', email: 'avery.morris@example.com', avatar: null },
  { name: 'Jessica Lee', email: 'jessica.lee@example.com', avatar: '300-5.png' },
  { name: 'Logan Collins', email: 'logan.collins@example.com', avatar: null },
  { name: 'Andrew Hall', email: 'andrew.hall@example.com', avatar: '300-18.png' },
  { name: 'Ella Peterson', email: 'ella.peterson@example.com', avatar: null },
  { name: 'Oliver Sanchez', email: 'oliver.sanchez@example.com', avatar: '300-28.png' },
  { name: 'Layla Powell', email: 'layla.powell@example.com', avatar: null },
  { name: 'Mason Russell', email: 'mason.russell@example.com', avatar: '300-27.png' },
  { name: 'Aria Bennett', email: 'aria.bennett@example.com', avatar: null },
  { name: 'Isabella Walker', email: 'isabella.walker@example.com', avatar: '300-17.png' },
  { name: 'Elijah Torres', email: 'elijah.torres@example.com', avatar: null },
  { name: 'Sebastian Perez', email: 'sebastian.perez@example.com', avatar: '300-30.png' },
  { name: 'Lucas Phillips', email: 'lucas.phillips@example.com', avatar: '300-32.png' },
  { name: 'Scarlett Edwards', email: 'scarlett.edwards@example.com', avatar: null },
  { name: 'Wyatt Parker', email: 'wyatt.parker@example.com', avatar: null },
  { name: 'Zoey Cooper', email: 'zoey.cooper@example.com', avatar: null },
  { name: 'Jane Smith', email: 'jane.smith@example.com', avatar: '300-2.png' },
  { name: 'Penelope Morgan', email: 'penelope.morgan@example.com', avatar: null },
  { name: 'Rihab Nasser', email: 'rihan@mail.com', avatar: null },
  { name: 'Demo Student Alpha', email: 'alpha.student@acadia-college.edu', avatar: '300-1.png' },
  { name: 'Demo Student Beta', email: 'beta.student@acadia-college.edu', avatar: '300-2.png' },
  { name: 'Demo Student Gamma', email: 'gamma.student@acadia-college.edu', avatar: null },
  { name: 'Demo Student Delta', email: 'delta.student@acadia-college.edu', avatar: '300-3.png' },
  { name: 'Demo Student Epsilon', email: 'epsilon.student@acadia-college.edu', avatar: '300-4.png' },
  { name: 'Demo Student Zeta', email: 'zeta.student@acadia-college.edu', avatar: null },
  { name: 'Demo Student Eta', email: 'eta.student@acadia-college.edu', avatar: '300-5.png' },
  { name: 'Demo Student Theta', email: 'theta.student@acadia-college.edu', avatar: '300-6.png' },
  { name: 'Demo Student Iota', email: 'iota.student@acadia-college.edu', avatar: null },
  { name: 'Demo Student Kappa', email: 'kappa.student@acadia-college.edu', avatar: '300-7.png' },
];

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

function stableId(index: number): string {
  const suffix = (index + 1).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
}

function buildStudents(): DummyStudent[] {
  const baseDate = new Date('2026-05-17T00:00:00.000Z');

  return SEED_USERS.map((user, index) => {
    const { first_name, last_name } = splitName(user.name);
    const enrollment_status =
      ENROLLMENT_STATUSES[index % ENROLLMENT_STATUSES.length];
    const enrolled = new Date(baseDate);
    enrolled.setDate(enrolled.getDate() - index * 3);

    return {
      id: stableId(index),
      student_id: `STU-${String(index + 1).padStart(4, '0')}`,
      first_name,
      last_name,
      email: user.email,
      avatar: user.avatar ? `/media/avatars/${user.avatar}` : null,
      class_name: CLASS_NAMES[index % CLASS_NAMES.length],
      matricule_number:
        index % 7 === 0 ? null : `MAT-2026-${String(1000 + index)}`,
      enrollment_status,
      status: enrollment_status === 'inactive' ? 'inactive' : 'active',
      enrollment_date: enrolled.toISOString(),
      email_verified: index % 5 !== 0,
    };
  });
}

export const DUMMY_STUDENTS: DummyStudent[] = buildStudents();

export function getDummyStudentFullName(student: DummyStudent): string {
  return [student.first_name, student.last_name].filter(Boolean).join(' ');
}

export function getDummyStudentClasses(): string[] {
  return Array.from(new Set(DUMMY_STUDENTS.map((s) => s.class_name))).sort();
}

export function getDummyStudentById(id: string): DummyStudent | undefined {
  return DUMMY_STUDENTS.find((s) => s.id === id);
}

export type DummyStudentFilter = {
  query?: string;
  className?: string | null;
  enrollmentStatus?: string | null;
};

export function filterDummyStudents({
  query = '',
  className = null,
  enrollmentStatus = null,
}: DummyStudentFilter): DummyStudent[] {
  const q = query.trim().toLowerCase();

  return DUMMY_STUDENTS.filter((student) => {
    if (className && className !== 'all' && student.class_name !== className) {
      return false;
    }
    if (
      enrollmentStatus &&
      enrollmentStatus !== 'all' &&
      student.enrollment_status !== enrollmentStatus
    ) {
      return false;
    }
    if (!q) {
      return true;
    }
    const fullName = getDummyStudentFullName(student).toLowerCase();
    return (
      fullName.includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.student_id.toLowerCase().includes(q) ||
      (student.matricule_number?.toLowerCase().includes(q) ?? false)
    );
  });
}
