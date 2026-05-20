'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ExamSessionForm } from '@/components/acadia/assessment/exam-session-form';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

export default function NewExamSessionPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="New exam session"
      description="Create an examination for a subject (FR-4.2.1)."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/exams">Back to exams</Link>
        </Button>
      </div>
      {canManage ? (
        <ExamSessionForm onCancelHref="/exams" />
      ) : (
        <p className="text-sm text-muted-foreground">
          You do not have permission to create exam sessions.
        </p>
      )}
    </AcadiaPageShell>
  );
}
