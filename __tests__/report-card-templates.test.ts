import { describe, expect, it } from 'vitest';
import { getMenuForRole } from '@/config/menu.acadia';
import { ACADEMIC_YEAR_SCOPED_TABLES } from '@/lib/acadia/academic-year-scope';
import {
  applyReportCardTemplateToAll,
  defaultReportCardTemplate,
  DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE,
  normalizeReportCardTemplatePreference,
  parseReportCardTemplateId,
  periodsUsingReportCardTemplate,
  reportCardTermFromAcademic,
  resolveReportCardLayout,
  resolveReportCardTemplate,
  sampleReportCardPreviewData,
} from '@/lib/acadia/report-card-templates';

describe('report-card template ids', () => {
  it('accepts sequence and yearSummary and rejects anything else', () => {
    expect(parseReportCardTemplateId('sequence')).toBe('sequence');
    expect(parseReportCardTemplateId('yearSummary')).toBe('yearSummary');
    expect(parseReportCardTemplateId('annual')).toBeNull();
    expect(parseReportCardTemplateId('term')).toBeNull();
    expect(parseReportCardTemplateId(undefined)).toBeNull();
  });

  it('keeps Term 3 and Annual on the year-summary layout by default', () => {
    expect(defaultReportCardTemplate('1')).toBe('sequence');
    expect(defaultReportCardTemplate('2')).toBe('sequence');
    expect(defaultReportCardTemplate('3')).toBe('yearSummary');
    expect(defaultReportCardTemplate('annual')).toBe('yearSummary');
    expect(resolveReportCardTemplate(null, '3')).toBe('yearSummary');
    expect(resolveReportCardTemplate(undefined, 'annual')).toBe('yearSummary');
  });

  it('falls back to defaults when a stored id is invalid', () => {
    const preference = normalizeReportCardTemplatePreference({
      term1Template: 'yearSummary',
      term2Template: 'not-a-template' as never,
      term3Template: 'sequence',
    });
    expect(preference.term1Template).toBe('yearSummary');
    expect(preference.term2Template).toBe('sequence');
    expect(preference.term3Template).toBe('sequence');
    expect(preference.annualTemplate).toBe('yearSummary');
  });

  it('resolves a saved preference per period', () => {
    const preference = {
      term1Template: 'yearSummary' as const,
      term2Template: 'sequence' as const,
      term3Template: 'sequence' as const,
      annualTemplate: 'sequence' as const,
    };
    expect(resolveReportCardTemplate(preference, '1')).toBe('yearSummary');
    expect(resolveReportCardTemplate(preference, '2')).toBe('sequence');
    expect(resolveReportCardTemplate(preference, '3')).toBe('sequence');
    expect(resolveReportCardTemplate(preference, 'annual')).toBe('sequence');
  });

  it('applies one template to every period', () => {
    expect(applyReportCardTemplateToAll('sequence')).toEqual({
      term1Template: 'sequence',
      term2Template: 'sequence',
      term3Template: 'sequence',
      annualTemplate: 'sequence',
    });
    expect(applyReportCardTemplateToAll('yearSummary')).toEqual({
      term1Template: 'yearSummary',
      term2Template: 'yearSummary',
      term3Template: 'yearSummary',
      annualTemplate: 'yearSummary',
    });
  });

  it('lists periods that currently use a template', () => {
    expect(
      periodsUsingReportCardTemplate(DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE, 'sequence'),
    ).toEqual(['1', '2']);
    expect(
      periodsUsingReportCardTemplate(DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE, 'yearSummary'),
    ).toEqual(['3', 'annual']);
  });

  it('maps academic.term onto a report-card period', () => {
    expect(reportCardTermFromAcademic(1)).toBe('1');
    expect(reportCardTermFromAcademic(2)).toBe('2');
    expect(reportCardTermFromAcademic(3)).toBe('3');
    expect(reportCardTermFromAcademic('annual')).toBe('annual');
  });

  it('uses templateId on the bulletin, then the period default', () => {
    expect(
      resolveReportCardLayout({
        academic: { year: '2025/2026', term: 1, orderNo: 'x' },
        templateId: 'yearSummary',
      }),
    ).toBe('yearSummary');
    expect(
      resolveReportCardLayout({
        academic: { year: '2025/2026', term: 3, orderNo: 'x' },
      }),
    ).toBe('yearSummary');
    expect(
      resolveReportCardLayout({
        academic: { year: '2025/2026', term: 1, orderNo: 'x' },
      }),
    ).toBe('sequence');
  });

  it('builds sample preview data for the gallery', () => {
    const sequence = sampleReportCardPreviewData('sequence');
    expect(sequence.templateId).toBe('sequence');
    expect(sequence.academic.term).toBe(1);
    expect(sequence.subjects.length).toBeGreaterThan(0);

    const annual = sampleReportCardPreviewData('yearSummary');
    expect(annual.templateId).toBe('yearSummary');
    expect(annual.academic.term).toBe('annual');
  });
});

describe('report-card templates menu', () => {
  it('adds templates under Reports for admins, not teachers', () => {
    const adminReports = getMenuForRole('admin').find((item) => item.titleKey === 'nav.reports');
    expect(adminReports?.children?.some((child) => child.path === '/reports/templates')).toBe(
      true,
    );
    expect(getMenuForRole('teacher').some((item) => item.path === '/reports/templates')).toBe(
      false,
    );
  });

  it('scopes the preference table to the academic year', () => {
    expect(ACADEMIC_YEAR_SCOPED_TABLES.has('ReportCardTemplatePreference')).toBe(true);
  });
});
