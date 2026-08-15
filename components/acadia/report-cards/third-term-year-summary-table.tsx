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
  type SubjectGrade,
} from '@/lib/acadia/report-card-types';

function coefficientCellDisplay(subject: SubjectGrade): string | number {
  if (subject.coefficient > 0) return subject.coefficient;
  if (subject.plannedCoefficient != null && subject.plannedCoefficient > 0) {
    return subject.plannedCoefficient;
  }
  return '-';
}

export function ThirdTermYearSummaryGradesTable({
  subjects,
  totalCoefficient,
  totalScore,
  tableAnnualAvg,
}: {
  subjects: SubjectGrade[];
  totalCoefficient: number;
  totalScore: number;
  tableAnnualAvg: number;
}) {
  const groupedSubjects = useMemo(() => {
    const groups: Record<string, SubjectGrade[]> = Object.fromEntries(
      REPORT_CARD_CATEGORIES.map((c) => [c, [] as SubjectGrade[]]),
    );
    subjects.forEach((subject) => {
      const category =
        subject.category && groups[subject.category] ? subject.category : 'others';
      groups[category].push(subject);
    });
    return REPORT_CARD_CATEGORIES.map((category) => ({
      category,
      subjects: groups[category] || [],
    })).filter((group) => group.subjects.length > 0);
  }, [subjects]);

  return (
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
          <th className="p-1 print:p-0.5 border-r border-black text-center" style={{ width: '6%' }}>
            Coef
          </th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">Term 1</th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">Term 2</th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">Term 3</th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">Annual Avg</th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">TOTAL</th>
          <th className="p-1 print:p-0.5 border-r border-black text-center">Grade</th>
          <th className="p-1 print:p-0.5 text-left">Remarks</th>
        </tr>
      </thead>
      <tbody className="text-[0.6rem] print:text-[7pt] font-mono">
        {groupedSubjects.map((group) => {
          const eligible = group.subjects.filter((s) => (s.coefficient ?? 0) > 0);
          const coef = eligible.reduce((sum, s) => sum + s.coefficient, 0);
          const sectionTotal = eligible.reduce((sum, s) => {
            const avg = s.annualAverage;
            return avg == null ? sum : sum + avg * s.coefficient;
          }, 0);
          const avg = coef > 0 ? sectionTotal / coef : 0;
          const rank =
            group.subjects.map((s) => s.rank ?? 0).filter((r) => r > 0)[0] ?? 0;
          const remark = `${avg >= 10 ? 'Pass' : 'Fail'} in ${categoryRemarkName(group.category)}`;

          return (
            <Fragment key={group.category}>
              {group.subjects.map((subject, idx) => {
                const annual = subject.annualAverage;
                const hasMark = annual != null;
                const grade = hasMark ? calculateGrade(annual) : '-';
                const remarks = hasMark ? getGradeRemarks(grade) : '-';
                const rowTotal =
                  hasMark && subject.coefficient > 0 ? annual * subject.coefficient : undefined;

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
                      {coefficientCellDisplay(subject)}
                    </td>
                    <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                      {formatReportMark(subject.term1)}
                    </td>
                    <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                      {formatReportMark(subject.term2)}
                    </td>
                    <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                      {formatReportMark(subject.term3)}
                    </td>
                    <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                      {formatReportMark(annual)}
                    </td>
                    <td className="p-1 print:p-0.5 border-r border-gray-300 text-center">
                      {rowTotal != null ? rowTotal.toFixed(0) : '-'}
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
                <td className="p-1 print:p-0.5 border-r border-black uppercase text-[0.55rem] print:text-[6pt]">
                  {categoryFullLabel(group.category)} Summary
                </td>
                <td className="p-1 print:p-0.5 border-r border-black text-center">{coef}</td>
                <td colSpan={3} className="p-1 print:p-0.5 border-r border-black text-center text-gray-400">
                  /
                </td>
                <td className="p-1 print:p-0.5 border-r border-black text-center text-[0.55rem]">
                  AV: {avg.toFixed(2)}
                </td>
                <td className="p-1 print:p-0.5 border-r border-black text-center">
                  {sectionTotal.toFixed(0)}
                </td>
                <td className="p-1 print:p-0.5 border-r border-black text-center">
                  {rank > 0 ? rank : '-'}
                </td>
                <td className="p-1 print:p-0.5 uppercase text-[0.55rem]">{remark}</td>
              </tr>
            </Fragment>
          );
        })}
        <tr className="bg-black text-white font-bold text-[0.65rem] print:text-[7pt]" style={{ backgroundColor: '#000', color: '#fff' }}>
          <td colSpan={2} className="p-1 print:p-0.5 text-left uppercase">
            Total Summary / Bilan Totale
          </td>
          <td className="p-1 print:p-0.5 text-center">{totalCoefficient}</td>
          <td colSpan={3} />
          <td className="p-1 print:p-0.5 text-center">{tableAnnualAvg.toFixed(2)}</td>
          <td className="p-1 print:p-0.5 text-center">{totalScore.toFixed(0)}</td>
          <td colSpan={2} style={{ backgroundColor: '#CCCCCC' }} />
        </tr>
      </tbody>
    </>
  );
}
