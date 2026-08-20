import type { ReactNode } from 'react';
import { AttendanceAccessGate } from '@/components/acadia/attendance/attendance-access-gate';

export default function AttendanceLayout({ children }: { children: ReactNode }) {
  return <AttendanceAccessGate>{children}</AttendanceAccessGate>;
}
