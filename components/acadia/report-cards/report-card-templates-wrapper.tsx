'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { ReportCardView } from '@/components/acadia/report-cards/report-card-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  assignReportCardTemplate,
  DEFAULT_REPORT_CARD_TEMPLATE_PREFERENCE,
  normalizeReportCardTemplatePreference,
  periodsUsingReportCardTemplate,
  sampleReportCardPreviewData,
  type ReportCardTemplatePreference,
} from '@/lib/acadia/report-card-templates';
import type { ReportCardTerm, ReportCardTemplateId } from '@/lib/acadia/report-card-types';

const PERIODS: ReportCardTerm[] = ['1', '2', '3', 'annual'];

const TEMPLATE_OPTIONS = [
  {
    id: 'sequence' as const,
    titleKey: 'reports.templateSequence',
    descriptionKey: 'reports.templateSequenceDescription',
  },
  {
    id: 'classicTerm' as const,
    titleKey: 'reports.templateClassicTerm',
    descriptionKey: 'reports.templateClassicTermDescription',
  },
  {
    id: 'yearSummary' as const,
    titleKey: 'reports.templateYearSummary',
    descriptionKey: 'reports.templateYearSummaryDescription',
  },
] as const;

function assignmentFor(
  templateId: ReportCardTemplateId,
  draft: ReportCardTemplatePreference,
): ReportCardTemplatePreference {
  return templateId === 'classicTerm'
    ? assignReportCardTemplate(draft, 'classicTerm')
    : applyReportCardTemplateToAll(templateId);
}

function periodLabelKey(period: ReportCardTerm): string {
  if (period === 'annual') return 'reports.annual';
  if (period === '1') return 'reports.term1';
  if (period === '2') return 'reports.term2';
  return 'reports.term3';
}

function previewStructure(sequencesPerYear: number) {
  return {
    termsPerYear: 3,
    sequencesPerTerm: Math.max(1, Math.round(sequencesPerYear / 3)),
    sequencesPerYear,
  };
}

function defaultPreviewPeriod(templateId: ReportCardTemplateId): ReportCardTerm {
  return templateId === 'yearSummary' ? 'annual' : '1';
}

function periodsForTemplate(templateId: ReportCardTemplateId): ReportCardTerm[] {
  return templateId === 'classicTerm' ? ['1', '2'] : PERIODS;
}

function TemplatePreview({
  templateId,
  sequencesPerYear,
  onOpen,
}: {
  templateId: ReportCardTemplateId;
  sequencesPerYear: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const french = getUiLocale() === 'fr';
  const data = useMemo(
    () =>
      sampleReportCardPreviewData(templateId, {
        structure: previewStructure(sequencesPerYear),
        french,
      }),
    [templateId, sequencesPerYear, french],
  );
  return (
    <button
      type="button"
      aria-label={t('reports.templatePreview')}
      className="relative block h-[380px] w-full cursor-pointer overflow-hidden rounded-lg border bg-muted/40 text-left hover:border-primary/40"
      onClick={onOpen}
    >
      <div aria-hidden className="pointer-events-none origin-top-left scale-[0.38] w-[263%]">
        <ReportCardView data={data} variant="pdfRender" />
      </div>
    </button>
  );
}

function TemplatePreviewDialog({
  templateId,
  title,
  sequencesPerYear,
  canWrite,
  saving,
  onOpenChange,
  onAssign,
}: {
  templateId: ReportCardTemplateId;
  title: string;
  sequencesPerYear: number;
  canWrite: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: () => void;
}) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<ReportCardTerm>(defaultPreviewPeriod(templateId));
  const french = getUiLocale() === 'fr';
  const data = useMemo(
    () =>
      sampleReportCardPreviewData(templateId, {
        structure: previewStructure(sequencesPerYear),
        french,
        period,
      }),
    [templateId, sequencesPerYear, french, period],
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 shrink-0 space-y-0 gap-3 border-b px-6 py-4 pe-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <DialogTitle>{t('reports.templatePreviewTitle', { template: title })}</DialogTitle>
            <DialogDescription>{t('reports.templatePreviewSample')}</DialogDescription>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={period}
            onValueChange={(value) => {
              if (value === '1' || value === '2' || value === '3' || value === 'annual') {
                setPeriod(value);
              }
            }}
            className="flex-wrap justify-start"
          >
            {periodsForTemplate(templateId).map((item) => (
              <ToggleGroupItem key={item} value={item} className="px-2.5">
                {t(periodLabelKey(item))}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          <ReportCardView data={data} />
        </div>
        {canWrite ? (
          <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
            <Button type="button" disabled={saving} onClick={onAssign}>
              {templateId === 'classicTerm'
                ? t('reports.useForFirstTwoTerms')
                : t('reports.useForAllTerms')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
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

  const [previewId, setPreviewId] = useState<ReportCardTemplateId | null>(null);

  const save = async (next: ReportCardTemplatePreference): Promise<boolean> => {
    if (!canWrite) return false;
    const allowed = await confirmWrite();
    if (!allowed) return false;
    const confirmed = window.confirm(t('reports.templatesConfirmChange'));
    if (!confirmed) return false;
    setDraft(next);
    await savePreference.mutateAsync(next);
    return true;
  };

  return (
    <div className="space-y-6">
      <CurrentAcademicYearBadge label={t('academics.year')} />

      <div className="grid gap-5 xl:grid-cols-2">
        {TEMPLATE_OPTIONS.map((template) => {
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
                  onOpen={() => setPreviewId(template.id)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setPreviewId(template.id)}
                >
                  <Eye />
                  {t('reports.templatePreview')}
                </Button>
                {canWrite ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={savePreference.isPending}
                    onClick={() => void save(assignmentFor(template.id, draft))}
                  >
                    {template.id === 'classicTerm'
                      ? t('reports.useForFirstTwoTerms')
                      : t('reports.useForAllTerms')}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewId ? (
        <TemplatePreviewDialog
          key={previewId}
          templateId={previewId}
          title={t(
            TEMPLATE_OPTIONS.find((template) => template.id === previewId)?.titleKey ??
              'reports.templateSequence',
          )}
          sequencesPerYear={yearStructure?.sequencesPerYear ?? 6}
          canWrite={canWrite}
          saving={savePreference.isPending}
          onOpenChange={(open) => {
            if (!open) setPreviewId(null);
          }}
          onAssign={() => {
            void save(assignmentFor(previewId, draft)).then((saved) => {
              if (saved) setPreviewId(null);
            });
          }}
        />
      ) : null}

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
                          {period === '1' || period === '2' ? (
                            <SelectItem value="classicTerm">
                              {t('reports.templateClassicTerm')}
                            </SelectItem>
                          ) : null}
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
