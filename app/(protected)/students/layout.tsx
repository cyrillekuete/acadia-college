import type { ReactNode } from 'react';
import { StudentRegistryAccessGate } from '@/components/acadia/student/student-registry-access-gate';

export default function StudentsLayout({ children }: { children: ReactNode }) {
  return <StudentRegistryAccessGate>{children}</StudentRegistryAccessGate>;
}
