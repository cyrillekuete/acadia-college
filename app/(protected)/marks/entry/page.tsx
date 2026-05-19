'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MarksEntryGrid } from '@/components/acadia/assessment/marks-entry-grid';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';

export default function MarksEntryPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canEnter = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Marks entry"
      description="Enter sequence-scoped CA and exam scores (FR-4.1.1)."
    >
      <div className="mb-4 flex gap-2 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marks">Back to marks</Link>
        </Button>
      </div>
      {canEnter ? (
        <MarksEntryGrid />
      ) : (
        <p className="text-sm text-muted-foreground">
          You do not have permission to enter marks.
        </p>
      )}
    </AcadiaPageShell>
  );
}
