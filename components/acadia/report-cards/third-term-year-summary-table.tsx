'use client';

import { Fragment, useMemo } from 'react';
import { groupSubjectsForReportCard } from '@/lib/acadia/report-card';
import {
  calculateGrade,
  formatReportMark,
  getGradeRemarks,
  isNegativeRemark,
} from '@/lib/acadia/report-card-grading';
import type { SubjectGrade } from '@/lib/acadia/report-card-types';
import { ReportCardGroupingCell } from '@/components/acadia/report-cards/report-card-grouping-cell';
import {
  REPORT_CARD_THEME,
  reportCardStatusColor,
} from '@/components/acadia/report-cards/report-card-theme';

const { navy, stripe, summary, border, white } = REPORT_CARD_THEME;

function coefficientCellDisplay(subject: SubjectGrade): string | number {
  if (subject.coefficient > 0) return subject.coefficient;
  if (subject.plannedCoefficient != null && subject.plannedCoefficient > 0) {
    return subject.plannedCoefficient;
  }
  return '-';
}

function termValue(subject: SubjectGrade, termNumber: number): number | undefined {
  const fromMap = subject.termAverages?.[`term${termNumber}`];
  if (typeof fromMap === 'number') {
    return fromMap;
  }
  if (termNumber === 1) return subject.term1;
  if (termNumber === 2) return subject.term2;
  if (termNumber === 3) return subject.term3;
  return undefined;
}

export function ThirdTermYearSummaryGradesTable({
  subjects,
  totalCoefficient,
  totalScore,
  tableAnnualAvg,
  termSlots,
}: {
  subjects: SubjectGrade[];
  totalCoefficient: number;
  totalScore: number;
  tableAnnualAvg: number;
  termSlots?: number[];
}) {
  const groupedSubjects = useMemo(
    () => groupSubjectsForReportCard(subjects),
    [subjects],
  );
  const terms = termSlots?.length ? termSlots : [1, 2, 3];

  return (
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
          <th
            className="p-1 print:p-0.5 text-center"
            style={{ width: '6%', borderColor: navy }}
          >
            Coef
          </th>
          {terms.map((termNumber) => (
            <th
              key={termNumber}
              className="p-1 print:p-0.5 text-center"
              style={{ borderColor: navy }}
            >
              Term {termNumber}
            </th>
          ))}
          <th className="p-1 print:p-0.5 text-center" style={{ borderColor: navy }}>
            Annual Avg
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
          const eligible = group.subjects.filter((s) => (s.coefficient ?? 0) > 0);
          const coef = eligible.reduce((sum, s) => sum + s.coefficient, 0);
          const sectionTotal = eligible.reduce((sum, s) => {
            const avg = s.annualAverage;
            return avg == null ? sum : sum + avg * s.coefficient;
          }, 0);
          const avg = coef > 0 ? sectionTotal / coef : 0;
          const rank =
            group.subjects.map((s) => s.rank ?? 0).filter((r) => r > 0)[0] ?? 0;
          const remark = `${avg >= 10 ? 'Pass' : 'Fail'} in ${group.remarkName}`;
          const groupPassed = avg >= 10;

          return (
            <Fragment key={group.key}>
              {group.subjects.map((subject, idx) => {
                const annual = subject.annualAverage;
                const hasMark = annual != null;
                const grade = hasMark ? calculateGrade(annual) : '-';
                const remarks = hasMark ? getGradeRemarks(grade) : '-';
                const rowTotal =
                  hasMark && subject.coefficient > 0 ? annual * subject.coefficient : undefined;
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
                      {coefficientCellDisplay(subject)}
                    </td>
                    {terms.map((termNumber) => (
                      <td
                        key={termNumber}
                        className="p-1 print:p-0.5 text-center"
                        style={{ borderColor: border, backgroundColor: rowBg }}
                      >
                        {formatReportMark(termValue(subject, termNumber))}
                      </td>
                    ))}
                    <td
                      className="p-1 print:p-0.5 text-center"
                      style={{ borderColor: border, backgroundColor: rowBg }}
                    >
                      {formatReportMark(annual)}
                    </td>
                    <td
                      className="p-1 print:p-0.5 text-center"
                      style={{ borderColor: border, backgroundColor: rowBg }}
                    >
                      {rowTotal != null ? rowTotal.toFixed(0) : '-'}
                    </td>
                    <td
                      className="p-1 print:p-0.5 text-center font-bold"
                      style={{
                        borderColor: border,
                        backgroundColor: rowBg,
                        color: grade === 'U' || grade === 'D' ? REPORT_CARD_THEME.red : 'inherit',
                      }}
                    >
                      {grade}
                    </td>
                    <td
                      className="p-1 print:p-0.5"
                      style={{
                        borderColor: border,
                        backgroundColor: rowBg,
                        color:
                          remarks !== '-'
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
                  className="p-1 print:p-0.5 uppercase text-[0.55rem] print:text-[6pt]"
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
                  colSpan={terms.length}
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
                  {sectionTotal.toFixed(0)}
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
          <td className="p-1 print:p-0.5 text-center">{totalCoefficient}</td>
          <td colSpan={terms.length} />
          <td className="p-1 print:p-0.5 text-center">{tableAnnualAvg.toFixed(2)}</td>
          <td className="p-1 print:p-0.5 text-center">{totalScore.toFixed(0)}</td>
          <td colSpan={2} />
        </tr>
      </tbody>
    </>
  );
}
