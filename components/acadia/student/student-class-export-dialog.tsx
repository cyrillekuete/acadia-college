'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import {
  formatStudentFeesAmounts,
  studentBranchLabel,
  studentFeesStatusLabel,
} from '@/lib/acadia/student-list';
import type { StudentListItem } from '@/lib/acadia/student-list-item';
import {
  buildStudentClassCsv,
  downloadStudentClassCsv,
  formatStudentForClassExport,
  studentClassExportFilename,
  studentsForClassExport,
  type StudentClassExportFormatters,
  type StudentClassExportLabels,
  type StudentClassExportOption,
} from '@/lib/acadia/student-class-export';
import type { StudentClassPrintJob } from '@/components/acadia/student/student-class-roster-print';

export type StudentClassExportFormat = 'csv' | 'pdf';

function buildExportI18n(t: TFunction): {
  labels: StudentClassExportLabels;
  formatters: StudentClassExportFormatters;
} {
  return {
    labels: {
      studentId: t('students.studentId'),
      matricule: t('students.matricule'),
      firstName: t('students.firstName'),
      lastName: t('students.lastName'),
      email: t('common.labels.email'),
      className: t('students.class'),
      branch: t('catalog.branchLabel'),
      enrollmentStatus: t('common.labels.status'),
      feesStatus: t('students.feesStatus'),
      feesAmounts: t('students.feesPaidTotal'),
    },
    formatters: {
      branch: (student) => {
        const branch = student.branch?.toUpperCase();
        if (!branch) {
          return '—';
        }
        const key = `catalog.branch.${branch}`;
        const translated = t(key);
        return translated === key ? studentBranchLabel(student.branch) : translated;
      },
      enrollmentStatus: (student) =>
        t(`students.enrollmentStatus.${student.enrollment_status}`),
      feesStatus: (student) => {
        const statusKey = (student.fees_status ?? 'pending').toLowerCase();
        if (['paid', 'pending', 'overdue', 'partial'].includes(statusKey)) {
          return t(`students.feesStatusValue.${statusKey}`);
        }
        return studentFeesStatusLabel(student.fees_status);
      },
      feesAmounts: (student) =>
        formatStudentFeesAmounts(student.paid_fees, student.total_fees) ?? '—',
    },
  };
}

export function StudentClassExportDialog({
  open,
  onOpenChange,
  students,
  filteredStudents,
  classOptions,
  academicYearLabel,
  initialClassId,
  onPrint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentListItem[];
  filteredStudents: StudentListItem[];
  classOptions: StudentClassExportOption[];
  academicYearLabel: string | null;
  initialClassId?: string | null;
  onPrint: (job: StudentClassPrintJob) => void;
}) {
  const { t, i18n } = useTranslation();
  const [classId, setClassId] = useState(initialClassId ?? '');
  const [format, setFormat] = useState<StudentClassExportFormat>('csv');
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);
  const [includeWithdrawn, setIncludeWithdrawn] = useState(false);

  useEffect(() => {
    if (open) {
      setClassId(initialClassId ?? classOptions[0]?.id ?? '');
      setFormat('csv');
      setUseCurrentFilters(true);
      setIncludeWithdrawn(false);
    }
  }, [classOptions, initialClassId, open]);

  const selectedOption = useMemo(
    () => classOptions.find((option) => option.id === classId) ?? null,
    [classId, classOptions],
  );

  const sourceStudents = useCurrentFilters ? filteredStudents : students;
  const canDownload = selectedOption != null;

  const handleDownload = () => {
    if (!selectedOption) {
      return;
    }

    const { labels, formatters } = buildExportI18n(t);
    const classStudents = studentsForClassExport(
      sourceStudents,
      selectedOption,
      includeWithdrawn,
    );

    if (format === 'csv') {
      const csv = buildStudentClassCsv(
        sourceStudents,
        selectedOption,
        labels,
        formatters,
        includeWithdrawn,
      );
      downloadStudentClassCsv(
        csv,
        studentClassExportFilename(selectedOption.name, academicYearLabel),
      );
      onOpenChange(false);
      return;
    }

    const locale = i18n.language?.startsWith('fr') ? 'fr-CM' : 'en-GB';
    onPrint({
      className: selectedOption.name,
      academicYearLabel: academicYearLabel
        ? `${t('students.academicYear')}: ${academicYearLabel}`
        : null,
      generatedLabel: t('students.generatedOn', {
        date: new Date().toLocaleString(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      }),
      studentCountLabel: t('students.studentCount', {
        count: classStudents.length,
      }),
      labels,
      rows: classStudents.map((student) =>
        formatStudentForClassExport(student, formatters),
      ),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('students.downloadListTitle')}</DialogTitle>
          <DialogDescription>
            {t('students.downloadListDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {classOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('students.noClassesToDownload')}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="student-class-export-class">
                  {t('students.class')}
                </Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger
                    id="student-class-export-class"
                    className="w-full"
                  >
                    <SelectValue placeholder={t('students.selectClass')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('students.downloadFormat')}</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(value) =>
                    setFormat(value as StudentClassExportFormat)
                  }
                  className="gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="student-class-export-csv" />
                    <Label
                      htmlFor="student-class-export-csv"
                      className="font-normal"
                    >
                      {t('students.downloadCsv')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="student-class-export-pdf" />
                    <Label
                      htmlFor="student-class-export-pdf"
                      className="font-normal"
                    >
                      {t('students.downloadPrint')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={useCurrentFilters}
                  onCheckedChange={(checked) =>
                    setUseCurrentFilters(checked === true)
                  }
                />
                {t('students.useCurrentFilters')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeWithdrawn}
                  onCheckedChange={(checked) =>
                    setIncludeWithdrawn(checked === true)
                  }
                />
                {t('students.includeWithdrawn')}
              </label>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.buttons.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
          >
            {format === 'pdf' ? t('common.buttons.print') : t('common.buttons.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
