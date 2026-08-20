import { REPORT_CARD_THEME } from '@/components/acadia/report-cards/report-card-theme';

const { navy, gold, grouping, green, red, stripe, summary, border } = REPORT_CARD_THEME;

export const REPORT_CARD_PDF_STYLES = `
@page {
  size: A4;
  margin: 0;
}
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
}
@media print, screen {
  .pdf-report-card,
  .pdf-report-card * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    box-sizing: border-box !important;
  }
  .pdf-report-card {
    width: 210mm !important;
    min-height: 297mm !important;
    max-width: 210mm !important;
    margin: 0 auto !important;
    background: white !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    font-size: 13px !important;
  }
  .pdf-report-card > div {
    flex: 1 1 auto;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
  }
  .pdf-report-card .rc-grades-wrap {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .pdf-report-card table {
    border-collapse: collapse !important;
    width: 100% !important;
    table-layout: fixed !important;
  }
  .pdf-report-card table.rc-grades-table {
    table-layout: auto !important;
    height: 100% !important;
    flex: 1 1 auto;
  }
  .pdf-report-card table.rc-grades-table thead {
    font-size: 10px !important;
  }
  .pdf-report-card table.rc-grades-table tbody {
    font-size: 11px !important;
  }
  .pdf-report-card table.rc-grades-table tbody tr {
    height: 1%;
  }
  .pdf-report-card .rc-student-grid {
    font-size: 12px !important;
  }
  .pdf-report-card .rc-student-grid span.block {
    font-size: 9px !important;
  }
  .pdf-report-card table.rc-grades-table td,
  .pdf-report-card table.rc-grades-table th {
    border: none !important;
    border-top: 1px solid ${border} !important;
    border-bottom: 1px solid ${border} !important;
  }
  .pdf-report-card table.rc-grades-table thead th,
  .pdf-report-card table.rc-grades-table tbody tr.rc-navy td {
    border-top: none !important;
    border-bottom: none !important;
  }
  .pdf-report-card table.rc-grades-table td.rc-grouping {
    border-top: 1px solid ${navy} !important;
    border-bottom: none !important;
  }
  .pdf-report-card table.rc-grades-table td.rc-grouping.rc-grouping-bottom {
    border-bottom: 1px solid ${navy} !important;
  }
  .pdf-report-card table td,
  .pdf-report-card table th {
    border: 1px solid ${border} !important;
    padding: 6px 6px !important;
    vertical-align: middle !important;
  }
  .pdf-report-card td.rc-grouping {
    width: 1% !important;
    padding: 8px 6px !important;
    white-space: normal !important;
  }
  .pdf-report-card .rc-grouping-label {
    writing-mode: vertical-rl !important;
    transform: rotate(180deg);
    font-size: 10.5pt !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap !important;
    overflow-wrap: normal;
    word-break: keep-all;
  }
  .pdf-report-card .rc-student-grid,
  .pdf-report-card .rc-student-grid > div,
  .pdf-report-card .rc-section {
    border-color: ${navy} !important;
  }
  .pdf-report-card .rc-student-grid > div {
    padding: 5px 8px !important;
    vertical-align: top !important;
  }
  .pdf-report-card .bg-gray-100 { background-color: ${stripe} !important; }
  .pdf-report-card .bg-gray-200 { background-color: ${summary} !important; }
  .pdf-report-card .bg-gray-300 { background-color: ${summary} !important; }
  .pdf-report-card .bg-black { background-color: ${navy} !important; }
  .pdf-report-card .text-white { color: #ffffff !important; }
  .pdf-report-card .text-red-600 { color: ${red} !important; }
  .pdf-report-card .text-green-700 { color: ${green} !important; }
  .pdf-report-card .opacity-\\[0\\.06\\] { opacity: 0.06 !important; }
  .pdf-report-card .rc-gold { background-color: ${gold} !important; position: relative; z-index: 1; }
  .pdf-report-card .rc-grouping { background-color: ${grouping} !important; position: relative; z-index: 1; }
  .pdf-report-card .rc-navy { background-color: ${navy} !important; color: #ffffff !important; }
  @media print {
    .pdf-report-card { box-shadow: none !important; }
    .pdf-report-card .print\\:hidden { display: none !important; }
    .pdf-report-card .print\\:shadow-none { box-shadow: none !important; }
    .pdf-report-card .print\\:overflow-visible { overflow: visible !important; }
    .pdf-report-card .print\\:w-full { width: 100% !important; }
    .pdf-report-card .print\\:max-w-full { max-width: 100% !important; }
    .pdf-report-card .print\\:h-auto { height: auto !important; }
    .pdf-report-card .print\\:min-h-\\[297mm\\] { min-height: 297mm !important; }
    .pdf-report-card .print\\:min-h-\\[4\\.25rem\\] { min-height: 4.25rem !important; }
    .pdf-report-card .print\\:p-0 { padding: 0 !important; }
    .pdf-report-card .print\\:p-0\\.5 { padding: 0.125rem !important; }
    .pdf-report-card .print\\:p-1 { padding: 0.25rem !important; }
    .pdf-report-card .print\\:px-0\\.5 { padding-left: 0.125rem !important; padding-right: 0.125rem !important; }
    .pdf-report-card .print\\:px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
    .pdf-report-card .print\\:px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
    .pdf-report-card .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
    .pdf-report-card .print\\:py-0\\.5 { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
    .pdf-report-card .print\\:pt-6 { padding-top: 1.5rem !important; }
    .pdf-report-card .print\\:pb-1 { padding-bottom: 0.25rem !important; }
    .pdf-report-card .print\\:pb-8 { padding-bottom: 2rem !important; }
    .pdf-report-card .print\\:mb-0 { margin-bottom: 0 !important; }
    .pdf-report-card .print\\:mb-0\\.5 { margin-bottom: 0.125rem !important; }
    .pdf-report-card .print\\:mb-1 { margin-bottom: 0.25rem !important; }
    .pdf-report-card .print\\:mb-3 { margin-bottom: 0.75rem !important; }
    .pdf-report-card .print\\:gap-0\\.5 { gap: 0.125rem !important; }
    .pdf-report-card .print\\:gap-1 { gap: 0.25rem !important; }
    .pdf-report-card .print\\:gap-1\\.5 { gap: 0.375rem !important; }
    .pdf-report-card .print\\:gap-2 { gap: 0.5rem !important; }
    .pdf-report-card .print\\:border { border-width: 1px !important; }
    .pdf-report-card .print\\:text-\\[5\\.5pt\\] { font-size: 5.5pt !important; }
    .pdf-report-card .print\\:text-\\[6pt\\] { font-size: 6pt !important; }
    .pdf-report-card .print\\:text-\\[7pt\\] { font-size: 7pt !important; }
    .pdf-report-card .print\\:text-\\[8pt\\] { font-size: 8pt !important; }
    .pdf-report-card .print\\:text-\\[9pt\\] { font-size: 9pt !important; }
    .pdf-report-card .print\\:text-\\[10\\.5pt\\] { font-size: 10.5pt !important; }
    .pdf-report-card .print\\:text-xs { font-size: 0.75rem !important; }
    .pdf-report-card .print\\:text-sm { font-size: 0.875rem !important; }
    .pdf-report-card .print\\:text-lg { font-size: 1.125rem !important; }
    .pdf-report-card .print\\:text-2xl { font-size: 1.5rem !important; }
    .pdf-report-card .print\\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
    .pdf-report-card .md\\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
    .pdf-report-card .md\\:flex-row { flex-direction: row !important; }
    .pdf-report-card .md\\:text-left { text-align: left !important; }
    .pdf-report-card .md\\:block { display: block !important; }
    .pdf-report-card .md\\:items-stretch { align-items: stretch !important; }
  }
}
`;
