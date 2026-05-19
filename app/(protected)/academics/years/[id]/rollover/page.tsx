'use client';

import { use } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { YearRolloverWizard } from '@/components/acadia/promotion/year-rollover-wizard';
import { Button } from '@/components/ui/button';

export default function AcademicYearRolloverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AcadiaPageShell
      title="Academic year rollover"
      description="Transition to a new school year: enrollments, calendar, and current year."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/academics/years">Back to academic years</Link>
        </Button>
      </div>
      <YearRolloverWizard sourceYearId={id} />
    </AcadiaPageShell>
  );
}
