'use client';

import { AcademicReportView } from '@/components/acadia/assessment/academic-report-view';

/** Class grade report (FR-4.1.3) — print-friendly rankings for a sequence scope. */
export function GradeReportView() {
  return <AcademicReportView kind="sequence" />;
}
