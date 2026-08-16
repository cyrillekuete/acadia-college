'use client';

import type { CSSProperties } from 'react';
import {
  REPORT_CARD_THEME,
  reportCardStatusColor,
} from '@/components/acadia/report-cards/report-card-theme';

const { navy, border } = REPORT_CARD_THEME;

export type StudentEvaluationResultsProps = {
  term1?: number;
  term2?: number;
  term3?: number;
  rank1?: number;
  rank2?: number;
  rank3?: number;
  annualAvg?: number;
  annualRank?: number;
  passed?: boolean;
  highlightTerm?: 1 | 2 | 3;
  showAnnualSummary?: boolean;
};

function formatAverage(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toFixed(1);
}

function formatAnnualAverage(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return value.toFixed(2);
}

function formatRank(value: number | undefined): string {
  if (value == null || value <= 0) return '-';
  return String(value);
}

function averagePassed(value: number | undefined): boolean | null {
  if (value == null || Number.isNaN(value)) return null;
  return value >= 10;
}

function averageColorClass(value: number | undefined): string {
  const passed = averagePassed(value);
  if (passed === null) return '';
  return passed ? 'text-green-700' : 'text-red-600';
}

function averageColorStyle(value: number | undefined): CSSProperties | undefined {
  const passed = averagePassed(value);
  if (passed === null) return undefined;
  return { color: reportCardStatusColor(passed) };
}

function annualTermCellClass(highlightTerm: 1 | 2 | 3 | undefined, term: 1 | 2 | 3): string {
  const base = 'px-0.5 py-1 print:px-0.5 print:py-0.5 text-center';
  return highlightTerm === term ? `${base} font-bold` : base;
}

export function StudentEvaluationResultsTable(props: StudentEvaluationResultsProps) {
  const {
    term1,
    term2,
    term3,
    rank1,
    rank2,
    rank3,
    annualAvg,
    annualRank,
    passed,
    highlightTerm,
    showAnnualSummary,
  } = props;

  const useAnnualSummary =
    showAnnualSummary ?? (annualAvg != null || annualRank != null || passed != null);

  if (!useAnnualSummary) {
    return (
      <div className="rc-section border bg-white/90" style={{ borderColor: navy }}>
        <div
          className="rc-navy p-0.5 print:p-0.5 text-left text-[11px] print:text-[8pt] font-bold uppercase border-b text-white"
          style={{ backgroundColor: navy, borderColor: navy }}
        >
          Student&apos;s Evaluation Results
        </div>
        <table className="w-full text-[12px] print:text-[9pt]">
          <thead>
            <tr>
              <th className="p-0.5 print:p-0.5 text-left" style={{ borderColor: border }}>
                TERM
              </th>
              <th className="p-0.5 print:p-0.5 text-left" style={{ borderColor: border }}>
                1
              </th>
              <th className="p-0.5 print:p-0.5 text-left" style={{ borderColor: border }}>
                2
              </th>
              <th className="p-0.5 print:p-0.5 text-left" style={{ borderColor: border }}>
                3
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
                className={`p-0.5 print:p-0.5 text-center ${averageColorClass(term1)}`}
                style={{ ...averageColorStyle(term1), borderColor: border }}
              >
                {formatAverage(term1)}
              </td>
              <td
                className={`p-0.5 print:p-0.5 text-center ${averageColorClass(term2)}`}
                style={{ ...averageColorStyle(term2), borderColor: border }}
              >
                {formatAverage(term2)}
              </td>
              <td
                className={`p-0.5 print:p-0.5 text-center ${averageColorClass(term3)}`}
                style={{ ...averageColorStyle(term3), borderColor: border }}
              >
                {formatAverage(term3)}
              </td>
            </tr>
            <tr className="font-mono">
              <td
                className="p-0.5 print:p-0.5 font-bold text-left pl-1"
                style={{ borderColor: border }}
              >
                RANK
              </td>
              <td className="p-0.5 print:p-0.5 text-center" style={{ borderColor: border }}>
                {formatRank(rank1)}
              </td>
              <td className="p-0.5 print:p-0.5 text-center" style={{ borderColor: border }}>
                {formatRank(rank2)}
              </td>
              <td className="p-0.5 print:p-0.5 text-center" style={{ borderColor: border }}>
                {formatRank(rank3)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const isPassed = passed ?? (annualAvg != null && annualAvg >= 10);

  return (
    <div
      className="rc-section border bg-white/90 h-full min-h-[4.5rem] print:min-h-[4.25rem] flex flex-col"
      style={{ borderColor: navy }}
    >
      <div className="grid grid-cols-[3fr_1fr] border-b" style={{ borderColor: navy }}>
        <div
          className="rc-navy p-0.5 print:p-0.5 text-left text-[11px] print:text-[8pt] font-bold uppercase text-white"
          style={{ backgroundColor: navy }}
        >
          Student&apos;s Evaluation Results
        </div>
        <div
          className="p-0.5 print:p-0.5 text-center text-[11px] print:text-[8pt] font-bold uppercase"
          style={{
            color: reportCardStatusColor(isPassed),
            backgroundColor: isPassed ? '#E8F5EC' : '#FDECEC',
          }}
        >
          {isPassed ? 'PASSED' : 'FAILED'}
        </div>
      </div>
      <table className="w-full text-[12px] print:text-[9pt] flex-1">
        <tbody>
          <tr>
            <td
              className="px-0.5 py-1 print:px-0.5 print:py-0.5 font-bold text-left pl-1"
              style={{ borderColor: border }}
            >
              TERM
            </td>
            <td className={annualTermCellClass(highlightTerm, 1)} style={{ borderColor: border }}>
              1
            </td>
            <td className={annualTermCellClass(highlightTerm, 2)} style={{ borderColor: border }}>
              2
            </td>
            <td
              className={annualTermCellClass(highlightTerm, 3)}
              style={{ borderColor: border }}
            >
              3
            </td>
            <td
              rowSpan={2}
              className="px-0.5 py-1 print:px-0.5 print:py-0.5 align-middle w-[28%]"
              style={{ borderColor: border }}
            >
              <div className="flex items-center justify-between gap-1 px-0.5">
                <span className="flex flex-col leading-none text-[10px] print:text-[8pt] font-bold uppercase">
                  <span>Annual</span>
                  <span>Avg</span>
                </span>
                <span
                  className={`text-xl print:text-lg font-black font-mono shrink-0 ${averageColorClass(annualAvg)}`}
                  style={averageColorStyle(annualAvg)}
                >
                  {formatAnnualAverage(annualAvg)}
                </span>
              </div>
            </td>
          </tr>
          <tr className="font-mono">
            <td
              className="px-0.5 py-1 print:px-0.5 print:py-0.5 font-bold text-left pl-1"
              style={{ borderColor: border }}
            >
              AVERAGE
            </td>
            <td
              className={`${annualTermCellClass(highlightTerm, 1)} ${averageColorClass(term1)}`}
              style={{ ...averageColorStyle(term1), borderColor: border }}
            >
              {formatAverage(term1)}
            </td>
            <td
              className={`${annualTermCellClass(highlightTerm, 2)} ${averageColorClass(term2)}`}
              style={{ ...averageColorStyle(term2), borderColor: border }}
            >
              {formatAverage(term2)}
            </td>
            <td
              className={`${annualTermCellClass(highlightTerm, 3)} ${averageColorClass(term3)}`}
              style={{ ...averageColorStyle(term3), borderColor: border }}
            >
              {formatAverage(term3)}
            </td>
          </tr>
          <tr className="font-mono">
            <td
              className="px-0.5 py-1 print:px-0.5 print:py-0.5 font-bold text-left pl-1"
              style={{ borderColor: border }}
            >
              RANK
            </td>
            <td className={annualTermCellClass(highlightTerm, 1)} style={{ borderColor: border }}>
              {formatRank(rank1)}
            </td>
            <td className={annualTermCellClass(highlightTerm, 2)} style={{ borderColor: border }}>
              {formatRank(rank2)}
            </td>
            <td
              className={annualTermCellClass(highlightTerm, 3)}
              style={{ borderColor: border }}
            >
              {formatRank(rank3)}
            </td>
            <td
              className="px-0.5 py-1 print:px-0.5 print:py-0.5 align-middle"
              style={{ borderColor: border }}
            >
              <div className="flex items-center justify-between gap-1 px-0.5">
                <span className="text-[10px] print:text-[8pt] font-bold uppercase">Rank</span>
                <span className="text-xl print:text-lg font-black">{formatRank(annualRank)}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
