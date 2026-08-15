'use client';

import { Fragment, useMemo } from 'react';
import {
  categoryFullLabel,
  categoryRemarkName,
  categoryShortLabel,
} from '@/lib/acadia/report-card';
import {
  calculateGrade,
  formatReportMark,
  getGradeRemarks,
  isNegativeRemark,
} from '@/lib/acadia/report-card-grading';
import {
  REPORT_CARD_CATEGORIES,
  type ReportCardData,
  type SubjectGrade,
} from '@/lib/acadia/report-card-types';
import {
  ReportCardFooter,
  ReportCardHeader,
  ReportCardPdfStyleTag,
  ReportCardSheet,
  ReportCardStudentGrid,
} from '@/components/acadia/report-cards/report-card-chrome';
import { StudentEvaluationResultsTable } from '@/components/acadia/report-cards/student-evaluation-results-table';
import { ThirdTermYearSummaryGradesTable } from '@/components/acadia/report-cards/third-term-year-summary-table';

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
  const term = typeof data.academic.term === 'number' ? data.academic.term : 3;
  const isThirdTermSummary = term === 3;
  const termSlots = data.sequenceSlots?.length
    ? data.sequenceSlots
    : term === 1
      ? [1, 2]
      : term === 2
        ? [3, 4]
        : [5, 6];

  const groupedSubjects = useMemo(() => {
    const groups: Record<string, SubjectGrade[]> = Object.fromEntries(
      REPORT_CARD_CATEGORIES.map((c) => [c, [] as SubjectGrade[]]),
    );
    data.subjects.forEach((subject) => {
      const category =
        subject.category && groups[subject.category] ? subject.category : 'others';
      groups[category].push(subject);
    });
    return REPORT_CARD_CATEGORIES.map((category) => ({
      category,
      subjects: groups[category] || [],
    })).filter((group) => group.subjects.length > 0);
  }, [data.subjects]);

  const tableAnnualAvg = data.history.annualAvg ?? data.totals.average;
  const tableAnnualPassed = tableAnnualAvg >= 10;

  return (
    <>
      <ReportCardPdfStyleTag />
      <ReportCardSheet variant={variant}>
        <ReportCardHeader data={data} mode="term" />
        <ReportCardStudentGrid data={data} />

        <div className="border border-black mb-1 print:mb-0.5 overflow-hidden relative z-10 bg-white/90">
          <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
            {isThirdTermSummary ? (
              <ThirdTermYearSummaryGradesTable
                subjects={data.subjects}
                totalCoefficient={data.totals.coefficient}
                totalScore={data.totals.totalScore}
                tableAnnualAvg={tableAnnualAvg}
              />
            ) : (
              <>
                <thead
                  className="bg-gray-100 text-[0.55rem] print:text-[7pt] uppercase font-bold border-b border-black"
                  style={{ backgroundColor: '#E0E0E0' }}
                >
                  <tr>
                    <th className="p-1 print:p-0.5 border-r border-black" style={{ width: '8%' }} />
                    <th className="p-1 print:p-0.5 border-r border-black text-left" style={{ width: '25%' }}>
                      Subjects
                    </th>
                    <th className="p-1 print:p-0.5 border-r border-black text-center">Coef</th>
                    {termSlots.map((globalNum) => (
                      <th
                        key={globalNum}
                        className="p-1 print:p-0.5 border-r border-black text-center"
                      >
                        Seq {globalNum}
                      </th>
                    ))}
                    <th className="p-1 print:p-0.5 border-r border-black text-center">Average</th>
                    <th className="p-1 print:p-0.5 border-r border-black text-center">TOTAL</th>
                    <th className="p-1 print:p-0.5 border-r border-black text-center">Grade</th>
                    <th className="p-1 print:p-0.5 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="text-[0.6rem] print:text-[7pt] font-mono">
                  {groupedSubjects.map((group) => {
                    const eligible = group.subjects.filter((s) => s.coefficient > 0);
                    const coef = eligible.reduce((sum, s) => sum + s.coefficient, 0);
                    const totalScore = eligible.reduce((sum, s) => {
                      const avg = s.termAverage ?? 0;
                      return sum + avg * s.coefficient;
                    }, 0);
                    const avg = coef > 0 ? totalScore / coef : 0;
                    const rank =
                      group.subjects.map((s) => s.rank ?? 0).filter((r) => r > 0)[0] ?? 0;
                    const remark = `${avg >= 10 ? 'Pass' : 'Fail'} in ${categoryRemarkName(group.category)}`;

                    return (
                      <Fragment key={group.category}>
                        {group.subjects.map((subject, idx) => {
                          const subjectAvg = subject.termAverage ?? 0;
                          const rowTotal =
                            subject.coefficient > 0 ? subjectAvg * subject.coefficient : 0;
                          const grade = subject.grade || (subject.hasMark ? calculateGrade(subjectAvg) : '');
                          const remarks =
                            subject.remarks || (grade ? getGradeRemarks(grade) : '');

                          return (
                            <tr key={`${group.category}-${subject.subjectId ?? idx}`}>
                              {idx === 0 ? (
                                <td
                                  rowSpan={group.subjects.length + 1}
                                  className="border-r border-black bg-gray-200 text-center font-bold text-[0.55rem] print:text-[6pt] p-0 uppercase relative"
                                  style={{ backgroundColor: '#E0E0E0', width: '30px' }}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
                                      {subject.groupingLabel?.toUpperCase() ||
                                        categoryShortLabel(group.category)}
                                    </span>
                                  </div>
                                </td>
                              ) : null}
                              <td className="p-1 print:p-0.5 border-r border-gray-300 font-medium">
                                {subject.subjectName}
                              </td>
                              <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                                {subject.coefficient > 0
                                  ? subject.coefficient
                                  : (subject.plannedCoefficient ?? '-')}
                              </td>
                              {termSlots.map((slot) => (
                                <td
                                  key={slot}
                                  className="p-1 print:p-0.5 border-r border-gray-300 text-center"
                                >
                                  {formatReportMark(sequenceValue(subject, slot))}
                                </td>
                              ))}
                              <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                                {subjectAvg > 0 ? subjectAvg.toFixed(1) : '-'}
                              </td>
                              <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                                {rowTotal > 0 ? rowTotal.toFixed(0) : '-'}
                              </td>
                              <td
                                className="p-1 print:p-0.5 border-r border-gray-300 text-center font-bold"
                                style={{
                                  color: grade === 'U' || grade === 'D' ? '#dc2626' : 'inherit',
                                }}
                              >
                                {grade}
                              </td>
                              <td
                                className="p-1 print:p-0.5"
                                style={{
                                  color: isNegativeRemark(remarks) ? '#dc2626' : '#15803d',
                                }}
                              >
                                {remarks}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-300 font-bold" style={{ backgroundColor: '#CCCCCC' }}>
                          <td className="p-1 print:p-0.5 border-r border-black uppercase text-[0.55rem]">
                            {categoryFullLabel(group.category)} Summary
                          </td>
                          <td className="p-1 print:p-0.5 border-r border-black text-center">{coef}</td>
                          <td
                            colSpan={termSlots.length || 1}
                            className="p-1 print:p-0.5 border-r border-black text-center text-gray-400"
                          >
                            /
                          </td>
                          <td className="p-1 print:p-0.5 border-r border-black text-center text-[0.55rem]">
                            AV: {avg.toFixed(2)}
                          </td>
                          <td className="p-1 print:p-0.5 border-r border-black text-center">
                            {totalScore.toFixed(0)}
                          </td>
                          <td className="p-1 print:p-0.5 border-r border-black text-center">
                            {rank > 0 ? rank : '-'}
                          </td>
                          <td className="p-1 print:p-0.5 uppercase text-[0.55rem]">{remark}</td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  <tr
                    className="bg-black text-white font-bold text-[0.65rem] print:text-[7pt]"
                    style={{ backgroundColor: '#000', color: '#fff' }}
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
                    <td colSpan={2} style={{ backgroundColor: '#CCCCCC' }} />
                  </tr>
                </tbody>
              </>
            )}
          </table>
        </div>

        <ReportCardFooter
          data={data}
          evaluation={
            isThirdTermSummary ? (
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
                highlightTerm={3}
              />
            ) : (
              <div className="border border-black bg-white/90">
                <div className="bg-gray-100 p-0.5 print:p-0.5 text-left text-[0.55rem] print:text-[6pt] font-bold uppercase border-b border-black">
                  Student&apos;s Evaluation Results
                </div>
                <table className="w-full text-[0.6rem] print:text-[7pt]">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="p-0.5 print:p-0.5 border-r border-gray-300 text-left">TERM</th>
                      <th className="p-0.5 print:p-0.5 text-left">{term}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-300 font-mono">
                      <td className="p-0.5 print:p-0.5 font-bold border-r border-gray-300 text-left pl-1">
                        AVERAGE
                      </td>
                      <td
                        className="p-0.5 print:p-0.5 font-bold"
                        style={{ color: data.totals.average >= 10 ? '#15803d' : '#dc2626' }}
                      >
                        {data.totals.average.toFixed(1)}
                      </td>
                    </tr>
                    <tr className="font-mono">
                      <td className="p-0.5 print:p-0.5 font-bold border-r border-gray-300 text-left pl-1">
                        RANK
                      </td>
                      <td className="p-0.5 print:p-0.5">{data.history.rank ?? '-'}</td>
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
