'use client';

import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';

export default function PromotionStatementPage() {
  return (
    <AcadiaPageShell
      title="Promotion statements"
      description="Promotion and admission decisions based on year averages (FR-4.3.4)."
    >
      <AcademicReportView kind="promotion" />
    </AcadiaPageShell>
  );
}
