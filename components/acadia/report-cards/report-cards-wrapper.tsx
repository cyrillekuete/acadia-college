'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { ReportCardView } from '@/components/acadia/report-cards/report-card-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTermOptions } from '@/hooks/use-academic-calendar-options';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { useClassEnrolledStudents } from '@/hooks/use-class-enrolled-students';
import { useClassReportClassList } from '@/hooks/use-class-report-class-list';
import { useTranslation } from '@/hooks/useTranslation';
import {
  buildReportCardPdfFilename,
  fetchClassBulletinsPdfBlob,
  fetchReportCardPdfBlob,
  savePdfBlobToDownloads,
} from '@/lib/acadia/report-card-pdf-download';
import type { ReportCardData, ReportCardTerm } from '@/lib/acadia/report-card-types';
import { getStudentFullName } from '@/lib/acadia/student-list-item';
import { ArrowLeft, Download, FileText, GraduationCap, Search, Users } from '@/lib/icons';

const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please log in again to generate report cards.';

function termOptionLabel(
  t: (key: string, values?: Record<string, unknown>) => string,
  termNumber: number,
): string {
  if (termNumber === 1) return t('reports.term1');
  if (termNumber === 2) return t('reports.term2');
  if (termNumber === 3) return t('reports.term3');
  return t('reports.termN', { n: termNumber });
}

export function ReportCardsWrapper({
  defaultTerm = '1',
}: {
  defaultTerm?: ReportCardTerm;
}) {
  const { t } = useTranslation();
  const { activeYearId } = useActiveAcademicYear();
  const [selectedTerm, setSelectedTerm] = useState<ReportCardTerm>(defaultTerm);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [includeWithdrawn, setIncludeWithdrawn] = useState(false);
  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingClassPdf, setDownloadingClassPdf] = useState(false);

  const { data: classes = [], isLoading: loadingClasses } = useClassReportClassList();
  const { data: students = [], isLoading: loadingStudents } = useClassEnrolledStudents(
    selectedClass || null,
    { includeWithdrawn },
  );
  const { data: terms = [] } = useTermOptions(activeYearId);
  const { data: yearStructure } = useAcademicYearStructure(activeYearId ?? null);
  const termNumbers =
    terms.length > 0
      ? terms.map((term) => term.number)
      : Array.from({ length: yearStructure?.termsPerYear ?? 3 }, (_, index) => index + 1);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const name = getStudentFullName(student).toLowerCase();
      const matricule = (student.matricule_number ?? student.student_id).toLowerCase();
      return name.includes(q) || matricule.includes(q);
    });
  }, [students, searchQuery]);

  useEffect(() => {
    setSelectedStudentId(null);
    setReportData(null);
    setError(null);
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedStudentId || !activeYearId) {
      setReportData(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingReport(true);
      setReportData(null);
      setError(null);
      try {
        const qs = new URLSearchParams({
          term: selectedTerm,
          academicYearId: activeYearId,
        });
        if (selectedClass) qs.set('classId', selectedClass);
        const res = await fetch(
          `/api/acadia/report-cards/${selectedStudentId}?${qs.toString()}`,
          { credentials: 'include', cache: 'no-store' },
        );
        if (res.status === 401) {
          throw new Error(SESSION_EXPIRED_MESSAGE);
        }
        const json = (await res.json()) as { data?: ReportCardData; error?: string };
        if (!res.ok || !json.data) {
          throw new Error(json.error || t('reports.loadFailed'));
        }
        if (!cancelled) {
          setReportData(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setReportData(null);
          setError(err instanceof Error ? err.message : t('reports.loadFailed'));
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
  }, [selectedStudentId, selectedTerm, selectedClass, activeYearId, t]);

  const handleDownloadPdf = async () => {
    if (!selectedStudentId || !reportData) return;
    setDownloadingPdf(true);
    try {
      const blob = await fetchReportCardPdfBlob({
        studentId: selectedStudentId,
        term: selectedTerm,
        classId: selectedClass || undefined,
        academicYearId: activeYearId ?? undefined,
      });
      savePdfBlobToDownloads(
        blob,
        buildReportCardPdfFilename({
          studentName: reportData.student.name,
          year: reportData.academic.year,
          term: selectedTerm,
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('reports.pdfFailed'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadClassPdf = async () => {
    if (!selectedClass) return;
    setDownloadingClassPdf(true);
    try {
      const blob = await fetchClassBulletinsPdfBlob({
        classId: selectedClass,
        term: selectedTerm,
        academicYearId: activeYearId ?? undefined,
        includeWithdrawn,
      });
      const className = classes.find((row) => row.id === selectedClass)?.name ?? 'class';
      savePdfBlobToDownloads(
        blob,
        `ClassBulletins_${className}_${selectedTerm}.pdf`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('reports.pdfFailed'));
    } finally {
      setDownloadingClassPdf(false);
    }
  };

  if (selectedStudent && (reportData || loadingReport || error)) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudentId(null);
              setReportData(null);
              setError(null);
            }}
          >
            <ArrowLeft className="size-4" />
            {t('reports.backToClass')}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedTerm}
              onValueChange={(value) => setSelectedTerm(value as ReportCardTerm)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {termNumbers.map((termNumber) => (
                  <SelectItem key={termNumber} value={String(termNumber)}>
                    {termOptionLabel(t, termNumber)}
                  </SelectItem>
                ))}
                <SelectItem value="annual">{t('reports.annual')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleDownloadPdf()}
              disabled={!reportData || downloadingPdf}
            >
              <Download className="size-4" />
              {downloadingPdf ? t('reports.generatingPdf') : t('reports.downloadPdf')}
            </Button>
          </div>
        </div>
        {loadingReport ? (
          <p className="text-sm text-muted-foreground">{t('reports.loadingBulletin')}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {reportData && !loadingReport ? <ReportCardView data={reportData} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
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
          <label className="text-sm font-medium">{t('reports.selectTerm')}</label>
          <Select
            value={selectedTerm}
            onValueChange={(value) => setSelectedTerm(value as ReportCardTerm)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {termNumbers.map((termNumber) => (
                <SelectItem key={termNumber} value={String(termNumber)}>
                  {termOptionLabel(t, termNumber)}
                </SelectItem>
              ))}
              <SelectItem value="annual">{t('reports.annualYearSummaryHint')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-1 text-sm">
          <Checkbox
            checked={includeWithdrawn}
            onCheckedChange={(checked) => setIncludeWithdrawn(checked === true)}
          />
          {t('reports.includeWithdrawn')}
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!selectedClass || downloadingClassPdf || students.length === 0}
          onClick={() => void handleDownloadClassPdf()}
        >
          <Download className="size-4" />
          {downloadingClassPdf ? t('reports.generatingPdf') : t('reports.downloadClassPdfs')}
        </Button>
      </div>

      {!selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              {t('reports.chooseClassTitle')}
            </CardTitle>
            <CardDescription>{t('reports.chooseClassDescription')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              {t('reports.classRoster')}
            </CardTitle>
            <CardDescription>{t('reports.pickStudent')}</CardDescription>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('reports.searchStudent')}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <p className="text-sm text-muted-foreground">{t('reports.loadingStudents')}</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reports.noStudents')}</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {filteredStudents.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <span>
                        <span className="block font-medium">{getStudentFullName(student)}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.matricule_number || student.student_id}
                        </span>
                      </span>
                      <FileText className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
