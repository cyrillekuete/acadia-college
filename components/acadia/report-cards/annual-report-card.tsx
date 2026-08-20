'use client';

import type { ReportCardData } from '@/lib/acadia/report-card-types';
import {
  ReportCardFooter,
  ReportCardHeader,
  ReportCardPdfStyleTag,
  ReportCardSheet,
  ReportCardStudentGrid,
} from '@/components/acadia/report-cards/report-card-chrome';
import { StudentEvaluationResultsTable } from '@/components/acadia/report-cards/student-evaluation-results-table';
import { ThirdTermYearSummaryGradesTable } from '@/components/acadia/report-cards/third-term-year-summary-table';
import { ReportCardNotices } from '@/components/acadia/report-cards/report-notices';

export function AnnualReportCard({
  data,
  variant = 'default',
}: {
  data: ReportCardData;
  variant?: 'default' | 'pdfRender';
}) {
  const tableAnnualAvg = data.history.annualAvg ?? data.totals.average;

  return (
    <>
      <ReportCardPdfStyleTag />
      <ReportCardSheet variant={variant}>
        <ReportCardHeader data={data} mode="annual" />
        <ReportCardStudentGrid data={data} />
        <ReportCardNotices data={data} />

        <div className="rc-grades-wrap rc-section mb-1 print:mb-0.5 overflow-hidden relative z-10 bg-white/90">
          <table className="rc-grades-table w-full text-left border-collapse">
            <ThirdTermYearSummaryGradesTable
              subjects={data.subjects}
              totalCoefficient={data.totals.coefficient}
              totalScore={data.totals.totalScore}
              tableAnnualAvg={tableAnnualAvg}
              termSlots={data.termSlots}
            />
          </table>
        </div>

        <ReportCardFooter
          data={data}
          evaluation={
            <StudentEvaluationResultsTable
              term1={data.history.term1}
              term2={data.history.term2}
              term3={data.history.term3}
              rank1={data.history.rank1}
              rank2={data.history.rank2}
              rank3={data.history.rank3}
              annualAvg={tableAnnualAvg}
              annualRank={data.history.rank}
              passed={tableAnnualAvg >= 10}
            />
          }
        />
      </ReportCardSheet>
    </>
  );
}
