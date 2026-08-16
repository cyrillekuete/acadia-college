export const REPORT_CARD_THEME = {
  navy: '#1B2745',
  gold: '#C59434',
  grouping: '#F4E6C1',
  green: '#2D8A4E',
  red: '#D32F2F',
  stripe: '#F4F4F4',
  summary: '#E8EEF2',
  border: '#C5CDD6',
  white: '#FFFFFF',
} as const;

export function reportCardStatusColor(passed: boolean): string {
  return passed ? REPORT_CARD_THEME.green : REPORT_CARD_THEME.red;
}

export function reportCardPeriodLabel(term: number | 'annual'): string {
  if (term === 'annual') return 'ANNUAL';
  if (term === 1) return 'FIRST TERM';
  if (term === 2) return 'SECOND TERM';
  return 'THIRD TERM';
}
