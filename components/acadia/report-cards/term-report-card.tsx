'use client';

import { Fragment, useMemo } from 'react';
import { groupSubjectsForReportCard } from '@/lib/acadia/report-card';
import {
  calculateGrade,
  formatReportMark,
  getGradeRemarks,
  isNegativeRemark,
} from '@/lib/acadia/report-card-grading';
import {
  reportCardTermFromAcademic,
  resolveReportCardLayout,
} from '@/lib/acadia/report-card-templates';
import type { ReportCardData, SubjectGrade } from '@/lib/acadia/report-card-types';
import {
  ReportCardFooter,
  ReportCardHeader,
  ReportCardPdfStyleTag,
  ReportCardSheet,
  ReportCardStudentGrid,
} from '@/components/acadia/report-cards/report-card-chrome';
import { ReportCardGroupingCell } from '@/components/acadia/report-cards/report-card-grouping-cell';
import { StudentEvaluationResultsTable } from '@/components/acadia/report-cards/student-evaluation-results-table';
import { ThirdTermYearSummaryGradesTable } from '@/components/acadia/report-cards/third-term-year-summary-table';
import {
  REPORT_CARD_THEME,
  reportCardStatusColor,
} from '@/components/acadia/report-cards/report-card-theme';

const { navy, stripe, summary, border, white } = REPORT_CARD_THEME;

function sequenceValue(subject: SubjectGrade, slot: number): number | undefined {
  const key = `seq${slot}` as keyof SubjectGrade;
  const fromRoot = subject[key];
  if (typeof fromRoot === 'number') return fromRoot;
  const fromMap = subject.sequences?.[key as keyof NonNullable<SubjectGrade['sequences']>];
  return typeof fromMap === 'number' ? fromMap : undefined;
}

export function TermReportCard({
  data,
  variant = 'default',
}: {
  data: ReportCardData;
  variant?: 'default' | 'pdfRender';
}) {
  const period = reportCardTermFromAcademic(data.academic.term);
  const isAnnualPeriod = period === 'annual';
  const useYearSummary = resolveReportCardLayout(data) === 'yearSummary';
  const term = typeof data.academic.term === 'number' ? data.academic.term : 3;
  const termSlots = data.sequenceSlots?.length
    ? data.sequenceSlots
    : isAnnualPeriod
      ? [1, 2, 3, 4, 5, 6]
      : term === 1
        ? [1, 2]
        : term === 2
          ? [3, 4]
          : [5, 6];

  const groupedSubjects = useMemo(
    () => groupSubjectsForReportCard(data.subjects),
    [data.subjects],
  );

  const tableAnnualAvg = data.history.annualAvg ?? data.totals.average;
  const tableAnnualPassed = tableAnnualAvg >= 10;

  return (
    <>
      <ReportCardPdfStyleTag />
      <ReportCardSheet variant={variant}>
        <ReportCardHeader data={data} mode={isAnnualPeriod ? 'annual' : 'term'} />
        <ReportCardStudentGrid data={data} />

        <div className="rc-grades-wrap rc-section mb-1 print:mb-0.5 overflow-hidden relative z-10 bg-white/90">
          <table className="rc-grades-table w-full text-left border-collapse">
            {useYearSummary ? (
              <ThirdTermYearSummaryGradesTable
                subjects={data.subjects}
                totalCoefficient={data.totals.coefficient}
                totalScore={data.totals.totalScore}
                tableAnnualAvg={tableAnnualAvg}
              />
            ) : (
              <>
                <thead
                  className="rc-navy text-[0.55rem] print:text-[7pt] uppercase font-bold"
                  style={{ backgroundColor: navy, color: white }}
                >
                  <tr>
                    <th className="p-1 print:p-0.5" style={{ width: '1%', borderColor: navy }} />
                    <th
                      className="p-1 print:p-0.5 text-left"
                      style={{ width: '25%', borderColor: navy }}
                    >
                      Subjects
                    </th>
                    <th className="p-1 print:p-0.5 text-center" style={{ borderColor: navy }}>
                      Coef
                    </th>
                    {termSlots.map((globalNum) => (
                      <th
                        key={globalNum}
                        className="p-1 print:p-0.5 text-center"
                        style={{ borderColor: navy }}
                      >
                        Seq {globalNum}
                      </th>
                    ))}
                    <th className="p-1 print:p-0.5 text-center" style={{ borderColor: navy }}>
                      Average
                    </th>
                    <th className="p-1 print:p-0.5 text-center" style={{ borderColor: navy }}>
                      TOTAL
                    </th>
                    <th className="p-1 print:p-0.5 text-center" style={{ borderColor: navy }}>
                      Grade
                    </th>
                    <th className="p-1 print:p-0.5 text-left" style={{ borderColor: navy }}>
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[0.6rem] print:text-[7pt] font-mono">
                  {groupedSubjects.map((group, groupIndex) => {
                    const eligible = group.subjects.filter((s) => s.coefficient > 0);
                    const coef = eligible.reduce((sum, s) => sum + s.coefficient, 0);
                    const totalScore = eligible.reduce((sum, s) => {
                      const avg = s.termAverage ?? 0;
                      return sum + avg * s.coefficient;
                    }, 0);
                    const avg = coef > 0 ? totalScore / coef : 0;
                    const rank =
                      group.subjects.map((s) => s.rank ?? 0).filter((r) => r > 0)[0] ?? 0;
                    const remark = `${avg >= 10 ? 'Pass' : 'Fail'} in ${group.remarkName}`;
                    const groupPassed = avg >= 10;

                    return (
                      <Fragment key={group.key}>
                        {group.subjects.map((subject, idx) => {
                          const subjectAvg = subject.termAverage ?? 0;
                          const rowTotal =
                            subject.coefficient > 0 ? subjectAvg * subject.coefficient : 0;
                          const grade = subject.grade || (subject.hasMark ? calculateGrade(subjectAvg) : '');
                          const remarks =
                            subject.remarks || (grade ? getGradeRemarks(grade) : '');
                          const rowBg = idx % 2 === 1 ? stripe : white;

                          return (
                            <tr key={`${group.key}-${subject.subjectId ?? idx}`}>
                              {idx === 0 ? (
                                <ReportCardGroupingCell
                                  label={group.label}
                                  rowSpan={group.subjects.length + 1}
                                  showBottomBorder={groupIndex < groupedSubjects.length - 1}
                                />
                              ) : null}
                              <td
                                className="p-1 print:p-0.5 font-medium"
                                style={{ borderColor: border, backgroundColor: rowBg }}
                              >
                                {subject.subjectName}
                              </td>
                              <td
                                className="p-1 print:p-0.5 text-center"
                                style={{ borderColor: border, backgroundColor: rowBg }}
                              >
                                {subject.coefficient > 0
                                  ? subject.coefficient
                                  : (subject.plannedCoefficient ?? '-')}
                              </td>
                              {termSlots.map((slot) => (
                                <td
                                  key={slot}
                                  className="p-1 print:p-0.5 text-center"
                                  style={{ borderColor: border, backgroundColor: rowBg }}
                                >
                                  {formatReportMark(sequenceValue(subject, slot))}
                                </td>
                              ))}
                              <td
                                className="p-1 print:p-0.5 text-center"
                                style={{ borderColor: border, backgroundColor: rowBg }}
                              >
                                {subjectAvg > 0 ? subjectAvg.toFixed(1) : '-'}
                              </td>
                              <td
                                className="p-1 print:p-0.5 text-center"
                                style={{ borderColor: border, backgroundColor: rowBg }}
                              >
                                {rowTotal > 0 ? rowTotal.toFixed(0) : '-'}
                              </td>
                              <td
                                className="p-1 print:p-0.5 text-center font-bold"
                                style={{
                                  borderColor: border,
                                  backgroundColor: rowBg,
                                  color:
                                    grade === 'U' || grade === 'D'
                                      ? REPORT_CARD_THEME.red
                                      : 'inherit',
                                }}
                              >
                                {grade}
                              </td>
                              <td
                                className="p-1 print:p-0.5"
                                style={{
                                  borderColor: border,
                                  backgroundColor: rowBg,
                                  color: remarks
                                    ? isNegativeRemark(remarks)
                                      ? REPORT_CARD_THEME.red
                                      : REPORT_CARD_THEME.green
                                    : 'inherit',
                                }}
                              >
                                {remarks}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="font-bold">
                          <td
                            className="p-1 print:p-0.5 uppercase text-[0.55rem]"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            {group.label} Summary
                          </td>
                          <td
                            className="p-1 print:p-0.5 text-center"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            {coef}
                          </td>
                          <td
                            colSpan={termSlots.length || 1}
                            className="p-1 print:p-0.5 text-center text-gray-400"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            /
                          </td>
                          <td
                            className="p-1 print:p-0.5 text-center text-[0.55rem]"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            AV: {avg.toFixed(2)}
                          </td>
                          <td
                            className="p-1 print:p-0.5 text-center"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            {totalScore.toFixed(0)}
                          </td>
                          <td
                            className="p-1 print:p-0.5 text-center"
                            style={{ borderColor: navy, backgroundColor: summary }}
                          >
                            {rank > 0 ? rank : '-'}
                          </td>
                          <td
                            className="p-1 print:p-0.5 uppercase text-[0.55rem]"
                            style={{
                              borderColor: navy,
                              backgroundColor: summary,
                              color: reportCardStatusColor(groupPassed),
                            }}
                          >
                            {remark}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  <tr
                    className="rc-navy font-bold text-[0.65rem] print:text-[7pt]"
                    style={{ backgroundColor: navy, color: white }}
                  >
                    <td colSpan={2} className="p-1 print:p-0.5 text-left uppercase">
                      Total Summary / Bilan Totale
                    </td>
                    <td className="p-1 print:p-0.5 text-center">{data.totals.coefficient}</td>
                    <td colSpan={termSlots.length || 1} />
                    <td className="p-1 print:p-0.5 text-center">{data.totals.average.toFixed(2)}</td>
                    <td className="p-1 print:p-0.5 text-center">
                      {data.totals.totalScore.toFixed(0)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </>
            )}
          </table>
        </div>

        <ReportCardFooter
          data={data}
          evaluation={
            useYearSummary ? (
              <StudentEvaluationResultsTable
                term1={data.history.term1}
                term2={data.history.term2}
                term3={data.history.term3}
                rank1={data.history.rank1}
                rank2={data.history.rank2}
                rank3={data.history.rank3 ?? data.history.rank}
                annualAvg={tableAnnualAvg}
                annualRank={data.history.rank}
                passed={tableAnnualPassed}
                highlightTerm={
                  isAnnualPeriod ? undefined : period === '1' ? 1 : period === '2' ? 2 : 3
                }
              />
            ) : (
              <div
                className="rc-section border bg-white/90"
                style={{ borderColor: navy }}
              >
                <div
                  className="rc-navy p-0.5 print:p-0.5 text-left text-[11px] print:text-[8pt] font-bold uppercase border-b text-white"
                  style={{ backgroundColor: navy, borderColor: navy }}
                >
                  Student&apos;s Evaluation Results
                </div>
                <table className="w-full text-[12px] print:text-[9pt]">
                  <thead>
                    <tr>
                      <th
                        className="p-0.5 print:p-0.5 text-left"
                        style={{ borderColor: border }}
                      >
                        TERM
                      </th>
                      <th className="p-0.5 print:p-0.5 text-left" style={{ borderColor: border }}>
                        {isAnnualPeriod ? 'ANNUAL' : term}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-mono">
                      <td
                        className="p-0.5 print:p-0.5 font-bold text-left pl-1"
                        style={{ borderColor: border }}
                      >
                        AVERAGE
                      </td>
                      <td
                        className="p-0.5 print:p-0.5 font-bold"
                        style={{
                          borderColor: border,
                          color: reportCardStatusColor(data.totals.average >= 10),
                        }}
                      >
                        {data.totals.average.toFixed(1)}
                      </td>
                    </tr>
                    <tr className="font-mono">
                      <td
                        className="p-0.5 print:p-0.5 font-bold text-left pl-1"
                        style={{ borderColor: border }}
                      >
                        RANK
                      </td>
                      <td className="p-0.5 print:p-0.5" style={{ borderColor: border }}>
                        {data.history.rank ?? '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          }
        />
      </ReportCardSheet>
    </>
  );
}
