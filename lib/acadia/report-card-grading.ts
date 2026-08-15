/** Cameroon report-card scale (0–20): A / B / C / D / U. */

export function calculateGrade(mark: number): string {
  if (mark >= 17) return 'A';
  if (mark >= 14) return 'B';
  if (mark >= 10) return 'C';
  if (mark >= 7) return 'D';
  return 'U';
}

export function getGradeRemarks(grade: string): string {
  switch (grade) {
    case 'A':
      return 'Excellent';
    case 'B':
      return 'V.good';
    case 'C':
      return 'Pass';
    case 'D':
      return 'Failed';
    case 'U':
      return 'Very weak';
    default:
      return '';
  }
}

export function getRemarkForMark(mark: number): string {
  return getGradeRemarks(calculateGrade(mark));
}

export function isNegativeRemark(remark: string): boolean {
  const normalized = remark.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized.includes('fail') || normalized.includes('weak');
}

export function hasGceSubjectCode(code?: string | null): boolean {
  return typeof code === 'string' && code.trim().length > 0;
}

export function formatReportMark(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(digits);
}

export function sanitizeReportCardFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'student';
}

export function buildReportCardPdfFilename(options: {
  studentName: string;
  year: string | number;
  term: string | number;
}): string {
  const safe = sanitizeReportCardFilenamePart(options.studentName);
  const y = sanitizeReportCardFilenamePart(String(options.year));
  const termStr = String(options.term);
  if (termStr === 'annual') {
    return `ReportCard_${safe}_${y}_Annual.pdf`;
  }
  const term = sanitizeReportCardFilenamePart(termStr);
  return `ReportCard_${safe}_${y}_Term${term}.pdf`;
}
