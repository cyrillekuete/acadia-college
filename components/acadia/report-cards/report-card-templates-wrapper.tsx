'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { ReportCardView } from '@/components/acadia/report-cards/report-card-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademicYearWriteGuard } from '@/hooks/use-academic-year-write-guard';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  useReportCardTemplatePreference,
  useSaveReportCardTemplatePreference,
} from '@/hooks/use-report-card-template-preference';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteAcademicAdmin } from '@/lib/acadia/roles';
import { getUiLocale } from '@/lib/acadia/locale';
import {
  applyReportCardTemplateToAll,
  DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE,
  normalizeReportCardTemplatePreference,
  periodsUsingReportCardTemplate,
  sampleReportCardPreviewData,
  type ReportCardTemplatePreference,
} from '@/lib/acadia/report-card-templates';
import type { ReportCardTerm, ReportCardTemplateId } from '@/lib/acadia/report-card-types';

const PERIODS: ReportCardTerm[] = ['1', '2', '3', 'annual'];

function periodLabelKey(period: ReportCardTerm): string {
  if (period === 'annual') return 'reports.annual';
  if (period === '1') return 'reports.term1';
  if (period === '2') return 'reports.term2';
  return 'reports.term3';
}

function TemplatePreview({
  templateId,
  sequencesPerYear,
}: {
  templateId: ReportCardTemplateId;
  sequencesPerYear: number;
}) {
  const french = getUiLocale() === 'fr';
  const data = useMemo(
    () =>
      sampleReportCardPreviewData(templateId, {
        structure: {
          termsPerYear: 3,
          sequencesPerTerm: Math.max(1, Math.round(sequencesPerYear / 3)),
          sequencesPerYear,
        },
        french,
      }),
    [templateId, sequencesPerYear, french],
  );
  return (
    <div className="relative h-[380px] overflow-hidden rounded-lg border bg-muted/40">
      <div className="pointer-events-none origin-top-left scale-[0.38] w-[263%]">
        <ReportCardView data={data} variant="pdfRender" />
      </div>
    </div>
  );
}

export function ReportCardTemplatesWrapper() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canWrite = canWriteAcademicAdmin(session?.roleSlug);
  const { activeYearId } = useActiveAcademicYear();
  const { data: yearStructure } = useAcademicYearStructure(activeYearId ?? null);
  const { confirmWrite } = useAcademicYearWriteGuard();
  const { data: saved, isLoading } = useReportCardTemplatePreference();
  const savePreference = useSaveReportCardTemplatePreference();

  const [draft, setDraft] = useState<ReportCardTemplatePreference>(
    DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE,
  );

  useEffect(() => {
    setDraft(
      normalizeReportCardTemplatePreference(saved ?? DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE),
    );
  }, [saved]);

  const save = async (next: ReportCardTemplatePreference) => {
    if (!canWrite) return;
    const allowed = await confirmWrite();
    if (!allowed) return;
    const confirmed = window.confirm(t('reports.templatesConfirmChange'));
    if (!confirmed) return;
    setDraft(next);
    await savePreference.mutateAsync(next);
  };

  return (
    <div className="space-y-6">
      <CurrentAcademicYearBadge label={t('academics.year')} />

      <div className="grid gap-5 xl:grid-cols-2">
        {(
          [
            {
              id: 'sequence' as const,
              titleKey: 'reports.templateSequence',
              descriptionKey: 'reports.templateSequenceDescription',
            },
            {
              id: 'yearSummary' as const,
              titleKey: 'reports.templateYearSummary',
              descriptionKey: 'reports.templateYearSummaryDescription',
            },
          ] as const
        ).map((template) => {
          const usedFor = periodsUsingReportCardTemplate(draft, template.id);
          return (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle>{t(template.titleKey)}</CardTitle>
                <CardDescription>{t(template.descriptionKey)}</CardDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {usedFor.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t('reports.templateUnused')}
                    </span>
                  ) : (
                    usedFor.map((period) => (
                      <Badge key={period} variant="secondary" appearance="light">
                        {t(periodLabelKey(period))}
                      </Badge>
                    ))
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <TemplatePreview
                  templateId={template.id}
                  sequencesPerYear={yearStructure?.sequencesPerYear ?? 6}
                />
                {canWrite ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={savePreference.isPending}
                    onClick={() => void save(applyReportCardTemplateToAll(template.id))}
                  >
                    {t('reports.useForAllTerms')}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.templateAssignment')}</CardTitle>
          <CardDescription>{t('reports.templateAssignmentDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('reports.loadingTemplates')}</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {PERIODS.map((period) => {
                  const field =
                    period === '1'
                      ? 'term1Template'
                      : period === '2'
                        ? 'term2Template'
                        : period === '3'
                          ? 'term3Template'
                          : 'annualTemplate';
                  return (
                    <div key={period} className="space-y-1.5">
                      <label className="text-sm font-medium">{t(periodLabelKey(period))}</label>
                      <Select
                        value={draft[field]}
                        disabled={!canWrite || savePreference.isPending}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [field]: value as ReportCardTemplateId,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sequence">
                            {t('reports.templateSequence')}
                          </SelectItem>
                          <SelectItem value="yearSummary">
                            {t('reports.templateYearSummary')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {canWrite ? (
                <Button
                  type="button"
                  disabled={savePreference.isPending}
                  onClick={() => void save(draft)}
                >
                  {savePreference.isPending
                    ? t('reports.savingTemplates')
                    : t('reports.saveTemplates')}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('reports.templatesNoPermission')}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
