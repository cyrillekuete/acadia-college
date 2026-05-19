'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AttendanceSessionForm } from '@/components/acadia/attendance/attendance-session-form';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

export default function NewAttendanceSessionPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="New attendance session"
      description="Create a session and record daily marks (FR-5.1.1)."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/attendance">Back to attendance</Link>
        </Button>
      </div>
      {canManage ? (
        <AttendanceSessionForm onCancelHref="/attendance" />
      ) : (
        <p className="text-sm text-muted-foreground">
          You do not have permission to create attendance sessions.
        </p>
      )}
    </AcadiaPageShell>
  );
}
