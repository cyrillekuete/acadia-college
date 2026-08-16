'use client';

import { REPORT_CARD_THEME } from '@/components/acadia/report-cards/report-card-theme';

const { navy, grouping } = REPORT_CARD_THEME;

export function ReportCardGroupingCell({
  label,
  rowSpan,
  showBottomBorder = true,
}: {
  label: string;
  rowSpan: number;
  showBottomBorder?: boolean;
}) {
  const edge = `1px solid ${navy}`;

  return (
    <td
      rowSpan={rowSpan}
      className={`rc-grouping relative z-10 text-center font-black uppercase${
        showBottomBorder ? ' rc-grouping-bottom' : ''
      }`}
      style={{
        backgroundColor: grouping,
        color: navy,
        verticalAlign: 'middle',
        borderTop: edge,
        borderBottom: showBottomBorder ? edge : undefined,
      }}
    >
      <span
        className="rc-grouping-label inline-block text-[14px] print:text-[10.5pt] font-black tracking-wide"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </td>
  );
}
