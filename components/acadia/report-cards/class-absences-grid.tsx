'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { MarksDataGrid } from '@/components/acadia/assessment/marks-data-grid';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useClassDisciplineMutations } from '@/hooks/use-class-discipline-mutations';
import { useClassMasterClassList } from '@/hooks/use-class-master-class-list';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import {
  CLASS_DISCIPLINE_TERMS,
  classDisciplineRosterQueryKey,
  normalizeDisciplineCount,
  parseClassDisciplineTerm,
  type ClassDisciplineDraft,
  type ClassDisciplineStudent,
  type ClassDisciplineTerm,
} from '@/lib/acadia/class-discipline';
import { GraduationCap, LoaderCircleIcon } from '@/lib/icons';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchClassDisciplineRoster } from '@/lib/supabase/queries/class-discipline';

type DraftMap = Record<string, ClassDisciplineDraft>;

function emptyDraft(studentProfileId: string): ClassDisciplineDraft {
  return {
    studentProfileId,
    absenceHours: 0,
    suspensions: 0,
    warnings: 0,
  };
}

export function ClassAbsencesGrid() {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const { data: classes = [], isLoading: loadingClasses } = useClassMasterClassList();
  const { saveClassDiscipline } = useClassDisciplineMutations();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<ClassDisciplineTerm>('1');
  const [drafts, setDrafts] = useState<DraftMap>({});

  useEffect(() => {
    if (!selectedClass && classes[0]?.id) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const rosterQuery = useQuery({
    queryKey: classDisciplineRosterQueryKey(
      tenantId,
      activeYearId,
      selectedClass,
      selectedTerm,
    ),
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassDisciplineRoster(
        supabase,
        tenantId!,
        activeYearId!,
        selectedClass,
        Number(selectedTerm),
      );
    },
    enabled:
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      Boolean(activeYearId) &&
      Boolean(selectedClass),
  });

  useEffect(() => {
    if (!rosterQuery.data) {
      return;
    }
    const byStudent = new Map(
      rosterQuery.data.records.map((row) => [row.studentProfileId, row]),
    );
    const next: DraftMap = {};
    for (const student of rosterQuery.data.students) {
      const existing = byStudent.get(student.studentProfileId);
      next[student.studentProfileId] = existing
        ? {
            studentProfileId: student.studentProfileId,
            absenceHours: existing.absenceHours,
            suspensions: existing.suspensions,
            warnings: existing.warnings,
          }
        : emptyDraft(student.studentProfileId);
    }
    setDrafts(next);
  }, [rosterQuery.data]);

  const updateDraft = (
    studentProfileId: string,
    field: keyof Omit<ClassDisciplineDraft, 'studentProfileId'>,
    raw: string,
    max: number,
  ) => {
    setDrafts((prev) => {
      const current = prev[studentProfileId] ?? emptyDraft(studentProfileId);
      return {
        ...prev,
        [studentProfileId]: {
          ...current,
          [field]: raw === '' ? 0 : normalizeDisciplineCount(Number(raw), max),
        },
      };
    });
  };

  const handleSave = async () => {
    if (!activeYearId || !selectedClass) {
      return;
    }
    await saveClassDiscipline.mutateAsync({
      academicYearId: activeYearId,
      classId: selectedClass,
      termNumber: Number(parseClassDisciplineTerm(selectedTerm)),
      rows: Object.values(drafts),
    });
  };

  const students = rosterQuery.data?.students ?? [];

  const columns = useMemo<ColumnDef<ClassDisciplineStudent>[]>(
    () => [
      {
        id: 'student',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title={t('students.student')} visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="min-w-[160px]">
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.matricule}</p>
          </div>
        ),
        size: 240,
      },
      {
        id: 'absenceHours',
        accessorFn: (row) => drafts[row.studentProfileId]?.absenceHours ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('reports.absenceHours')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            max={999}
            step={1}
            className="w-24"
            value={drafts[row.original.studentProfileId]?.absenceHours ?? 0}
            onChange={(event) =>
              updateDraft(
                row.original.studentProfileId,
                'absenceHours',
                event.target.value,
                999,
              )
            }
          />
        ),
        size: 140,
        enableSorting: false,
      },
      {
        id: 'suspensions',
        accessorFn: (row) => drafts[row.original.studentProfileId]?.suspensions ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('reports.suspensions')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            max={99}
            step={1}
            className="w-24"
            value={drafts[row.original.studentProfileId]?.suspensions ?? 0}
            onChange={(event) =>
              updateDraft(
                row.original.studentProfileId,
                'suspensions',
                event.target.value,
                99,
              )
            }
          />
        ),
        size: 140,
        enableSorting: false,
      },
      {
        id: 'warnings',
        accessorFn: (row) => drafts[row.original.studentProfileId]?.warnings ?? 0,
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('reports.warnings')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Input
            type="number"
            min={0}
            max={99}
            step={1}
            className="w-24"
            value={drafts[row.original.studentProfileId]?.warnings ?? 0}
            onChange={(event) =>
              updateDraft(
                row.original.studentProfileId,
                'warnings',
                event.target.value,
                99,
              )
            }
          />
        ),
        size: 140,
        enableSorting: false,
      },
    ],
    [drafts, t],
  );

  const table = useReactTable({
    data: students,
    columns,
    getRowId: (row) => row.studentProfileId,
    state: {
      pagination: { pageIndex: 0, pageSize: Math.max(students.length, 8) },
    },
    getCoreRowModel: getCoreRowModel(),
  });

  if (!loadingClasses && classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="size-5" />
            {t('reports.absencesChooseTitle')}
          </CardTitle>
          <CardDescription>{t('reports.classReportNoClasses')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <CurrentAcademicYearBadge label={t('students.academicYear')} />
        <div className="min-w-[200px]">
          <p className="text-sm font-medium mb-1.5">{t('reports.selectClass')}</p>
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
        <div className="min-w-[180px]">
          <p className="text-sm font-medium mb-1.5">{t('reports.selectTerm')}</p>
          <Select
            value={selectedTerm}
            onValueChange={(value) =>
              setSelectedTerm(parseClassDisciplineTerm(value))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLASS_DISCIPLINE_TERMS.map((term) => (
                <SelectItem key={term} value={term}>
                  {t(`reports.term${term}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          disabled={
            saveClassDiscipline.isPending ||
            students.length === 0 ||
            !selectedClass
          }
          onClick={() => void handleSave()}
        >
          {saveClassDiscipline.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            t('common.buttons.save')
          )}
        </Button>
      </div>

      {selectedClass ? (
        <MarksDataGrid
          table={table}
          recordCount={students.length}
          isLoading={rosterQuery.isLoading}
          isError={rosterQuery.isError}
          error={rosterQuery.error}
          emptyMessage={t('reports.noStudents')}
          paginate={false}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5" />
              {t('reports.absencesChooseTitle')}
            </CardTitle>
            <CardDescription>
              {loadingClasses
                ? t('reports.loadingClasses')
                : t('reports.absencesChooseDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
