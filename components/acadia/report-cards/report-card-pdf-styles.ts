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
  }
  .pdf-report-card table {
    border-collapse: collapse !important;
    width: 100% !important;
    table-layout: fixed !important;
  }
  .pdf-report-card table td,
  .pdf-report-card table th {
    border: 1px solid #000 !important;
    padding: 4px 6px !important;
    vertical-align: middle !important;
  }
  .pdf-report-card .rc-student-grid > div {
    padding: 5px 8px !important;
    vertical-align: top !important;
  }
  .pdf-report-card .bg-gray-100 { background-color: #e0e0e0 !important; }
  .pdf-report-card .bg-gray-200 { background-color: #e0e0e0 !important; }
  .pdf-report-card .bg-gray-300 { background-color: #cccccc !important; }
  .pdf-report-card .bg-black { background-color: #000000 !important; }
  .pdf-report-card .text-white { color: #ffffff !important; }
  .pdf-report-card .text-red-600 { color: #dc2626 !important; }
  .pdf-report-card .text-green-700 { color: #15803d !important; }
  .pdf-report-card .opacity-\\[0\\.06\\] { opacity: 0.06 !important; }
  @media print {
    .pdf-report-card { box-shadow: none !important; }
    .pdf-report-card .print\\:hidden { display: none !important; }
  }
}
`;
