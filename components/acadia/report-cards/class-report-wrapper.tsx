'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { ClassReportDocument } from '@/components/acadia/report-cards/class-report-document';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTermOptions } from '@/hooks/use-academic-calendar-options';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { useClassReportClassList } from '@/hooks/use-class-report-class-list';
import {
  sequenceOptionLabel,
  useSequenceOptions,
} from '@/hooks/use-assessment-catalog-options';
import { useTranslation } from '@/hooks/useTranslation';
import {
  classReportQueryString,
  fetchClassReportPdfBlob,
} from '@/lib/acadia/class-report-pdf-download';
import {
  buildClassReportPdfFilename,
  classReportMatchesSelection,
  type ClassReportData,
  type ClassReportPeriod,
  type ClassReportPeriodKind,
} from '@/lib/acadia/class-report';
import { savePdfBlobToDownloads } from '@/lib/acadia/report-card-pdf-download';
import { Download, GraduationCap } from '@/lib/icons';

const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please log in again to generate class reports.';

function termOptionLabel(
  t: (key: string, values?: Record<string, unknown>) => string,
  termNumber: number,
): string {
  if (termNumber === 1) return t('reports.term1');
  if (termNumber === 2) return t('reports.term2');
  if (termNumber === 3) return t('reports.term3');
  return t('reports.termN', { n: termNumber });
}

export function ClassReportWrapper({
  lockedPeriodKind,
}: {
  lockedPeriodKind?: ClassReportPeriodKind;
} = {}) {
  const { t } = useTranslation();
  const { activeYearId } = useActiveAcademicYear();
  const { data: classes = [], isLoading: loadingClasses } = useClassReportClassList();
  const { data: sequences = [] } = useSequenceOptions(activeYearId);
  const { data: terms = [] } = useTermOptions(activeYearId);
  const { data: yearStructure } = useAcademicYearStructure(activeYearId ?? null);

  const [selectedClass, setSelectedClass] = useState('');
  const [periodKind, setPeriodKind] = useState<ClassReportPeriodKind>(
    lockedPeriodKind ?? 'term',
  );
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedSequence, setSelectedSequence] = useState('');
  const [topN, setTopN] = useState<5 | 10>(5);
  const [reportData, setReportData] = useState<ClassReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (lockedPeriodKind) {
      setPeriodKind(lockedPeriodKind);
    }
  }, [lockedPeriodKind]);

  const period: ClassReportPeriod | null = useMemo(() => {
    if (periodKind === 'annual') {
      return { kind: 'annual' };
    }
    if (periodKind === 'term') {
      return { kind: 'term', term: selectedTerm };
    }
    const sequenceNumber = Number(selectedSequence);
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
      return null;
    }
    return { kind: 'sequence', sequenceNumber };
  }, [periodKind, selectedTerm, selectedSequence]);

  const selectionKey = [
    selectedClass,
    activeYearId ?? '',
    period?.kind ?? '',
    period?.kind === 'term' ? period.term : '',
    period?.kind === 'sequence' ? String(period.sequenceNumber) : '',
    String(topN),
  ].join('|');

  const [appliedSelectionKey, setAppliedSelectionKey] = useState(selectionKey);
  if (appliedSelectionKey !== selectionKey) {
    setAppliedSelectionKey(selectionKey);
    setReportData(null);
    setError(null);
    setLoadingReport(Boolean(selectedClass && period && activeYearId));
  }

  const reportMatchesSelection = Boolean(
    reportData &&
      period &&
      classReportMatchesSelection(reportData, {
        classId: selectedClass,
        period,
        topN,
      }),
  );
  const canDownloadPdf = reportMatchesSelection && !loadingReport;

  useEffect(() => {
    if (!selectedSequence && sequences[0]?.number) {
      setSelectedSequence(String(sequences[0].number));
    }
  }, [sequences, selectedSequence]);

  useEffect(() => {
    if (terms.length > 0 && !terms.some((term) => String(term.number) === selectedTerm)) {
      setSelectedTerm(String(terms[0].number));
    }
  }, [terms, selectedTerm]);

  useEffect(() => {
    if (!selectedClass || !period || !activeYearId) {
      setReportData(null);
      setError(null);
      setLoadingReport(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingReport(true);
      setReportData(null);
      setError(null);
      try {
        const qs = classReportQueryString({
          classId: selectedClass,
          academicYearId: activeYearId,
          period,
          topN,
        });
        const res = await fetch(`/api/acadia/class-reports?${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        const json = (await res.json()) as { data?: ClassReportData; error?: string };
        if (!res.ok || !json.data) {
          throw new Error(json.error || t('reports.classLoadFailed'));
        }
        if (!cancelled) {
          setReportData(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setReportData(null);
          setError(err instanceof Error ? err.message : t('reports.classLoadFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoadingReport(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedClass, period, topN, activeYearId, t]);

  const handleDownloadPdf = async () => {
    if (!selectedClass || !period || !reportData || !canDownloadPdf) {
      return;
    }
    setDownloadingPdf(true);
    try {
      const blob = await fetchClassReportPdfBlob({
        classId: reportData.classId,
        academicYearId: activeYearId ?? undefined,
        period: reportData.period,
        topN: reportData.topN,
      });
      savePdfBlobToDownloads(
        blob,
        buildClassReportPdfFilename({
          className: reportData.className,
          year: reportData.academicYearLabel,
          period: reportData.period,
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('reports.pdfFailed'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="w-full max-w-xs space-y-1.5">
          <label className="text-sm font-medium">{t('reports.selectClass')}</label>
          <Select
            value={selectedClass}
            onValueChange={setSelectedClass}
            disabled={loadingClasses}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('reports.selectClass')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full max-w-[180px] space-y-1.5">
          <label className="text-sm font-medium">{t('reports.selectPeriod')}</label>
          <Select
            value={periodKind}
            onValueChange={(value) => setPeriodKind(value as ClassReportPeriodKind)}
            disabled={Boolean(lockedPeriodKind)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequence">{t('reports.periodSequence')}</SelectItem>
              <SelectItem value="term">{t('reports.periodTerm')}</SelectItem>
              <SelectItem value="annual">{t('reports.annual')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodKind === 'term' ? (
          <div className="w-full max-w-[180px] space-y-1.5">
            <label className="text-sm font-medium">{t('reports.selectTerm')}</label>
            <Select
              value={selectedTerm}
              onValueChange={setSelectedTerm}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(terms.length > 0
                  ? terms.map((term) => term.number)
                  : Array.from(
                      { length: yearStructure?.termsPerYear ?? 3 },
                      (_, index) => index + 1,
                    )
                ).map((termNumber) => (
                    <SelectItem key={termNumber} value={String(termNumber)}>
                      {termOptionLabel(t, termNumber)}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {periodKind === 'sequence' ? (
          <div className="w-full max-w-[220px] space-y-1.5">
            <label className="text-sm font-medium">{t('reports.selectSequence')}</label>
            <Select value={selectedSequence} onValueChange={setSelectedSequence}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.selectSequence')} />
              </SelectTrigger>
              <SelectContent>
                {sequences.map((seq) => (
                  <SelectItem key={seq.id} value={String(seq.number)}>
                    {sequenceOptionLabel(seq)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="w-full max-w-[140px] space-y-1.5">
          <label className="text-sm font-medium">{t('reports.topBottomN')}</label>
          <Select
            value={String(topN)}
            onValueChange={(value) => setTopN(value === '10' ? 10 : 5)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleDownloadPdf()}
          disabled={!canDownloadPdf || downloadingPdf}
        >
          <Download className="size-4" />
          {downloadingPdf ? t('reports.generatingPdf') : t('reports.downloadPdf')}
        </Button>
      </div>

      {!selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              {t('reports.classReportChooseTitle')}
            </CardTitle>
            <CardDescription>
              {loadingClasses
                ? t('reports.loadingClasses')
                : classes.length === 0
                  ? t('reports.classReportNoClasses')
                  : lockedPeriodKind === 'sequence'
                    ? t('reports.sequenceChooseDescription')
                    : t('reports.classReportChooseDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {selectedClass && loadingReport ? (
        <p className="text-sm text-muted-foreground">{t('reports.loadingClassReport')}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {reportData && reportMatchesSelection && !loadingReport ? (
        <ClassReportDocument data={reportData} />
      ) : null}
    </div>
  );
}
