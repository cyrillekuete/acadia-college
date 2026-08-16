'use client';

import { AnnualReportCard } from '@/components/acadia/report-cards/annual-report-card';
import { TermReportCard } from '@/components/acadia/report-cards/term-report-card';
import {
  reportCardTermFromAcademic,
  resolveReportCardLayout,
} from '@/lib/acadia/report-card-templates';
import type { ReportCardData } from '@/lib/acadia/report-card-types';

export function ReportCardView({
  data,
  variant = 'default',
}: {
  data: ReportCardData;
  variant?: 'default' | 'pdfRender';
}) {
  const layout = resolveReportCardLayout(data);
  const period = reportCardTermFromAcademic(data.academic.term);

  if (layout === 'yearSummary' && period === 'annual') {
    return <AnnualReportCard data={data} variant={variant} />;
  }

  return <TermReportCard data={data} variant={variant} />;
}
