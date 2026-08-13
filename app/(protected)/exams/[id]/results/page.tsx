'use client';

import { use } from 'react';
import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { ExamResultsPanel } from '@/components/acadia/assessment/exam-results-panel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

export default function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = useTranslation();
  const { id } = use(params);

  return (
    <AcadiaPageShell
      title={t('exams.resultsTitle')}
      description="Process and finalize marks for this exam session (FR-4.2.4)."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/exams/${id}`}>Back to exam</Link>
        </Button>
      </div>
      <ExamResultsPanel examSessionId={id} />
    </AcadiaPageShell>
  );
}
