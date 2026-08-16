import { REPORT_CARD_THEME } from '@/components/acadia/report-cards/report-card-theme';

const { navy, gold, grouping, green, red, stripe, summary, border } = REPORT_CARD_THEME;

export const REPORT_CARD_PDF_STYLES = `
@media print, screen {
  .pdf-report-card,
  .pdf-report-card * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
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
  }
}
`;
