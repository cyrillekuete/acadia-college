'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MarksAuditPanel } from '@/components/acadia/assessment/marks-audit-panel';
import { MarksAveragesPanel } from '@/components/acadia/assessment/marks-averages-panel';
import { MarksYearScopedList } from '@/components/acadia/assessment/marks-year-scoped-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { nestedFieldColumn } from '@/lib/acadia/list-columns';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

type Row = {
  id: string;
  Subject?: unknown;
  StudentProfile?: unknown;
} & Record<string, unknown>;

const columns: ColumnDef<Row>[] = [
  {
    ...nestedFieldColumn<Row>('student', 'Student', 'StudentProfile', 'registrationNumber'),
    size: 180,
  } as ColumnDef<Row>,
  {
    ...nestedFieldColumn<Row>('subject', 'Subject', 'Subject', 'code'),
    size: 140,
  } as ColumnDef<Row>,
  { accessorKey: 'caScore', header: 'CA', size: 80 },
  { accessorKey: 'examScore', header: 'Exam', size: 80 },
  { accessorKey: 'totalScore', header: 'Total', size: 80 },
  { accessorKey: 'updatedAt', header: 'Updated', size: 180 },
];

const SELECT = `
  id,
  caScore,
  examScore,
  totalScore,
  isResitEligible,
  updatedAt,
  Subject!SubjectMark_subjectId_tenantId_fkey ( code ),
  StudentProfile!SubjectMark_studentProfileId_tenantId_fkey ( registrationNumber )
`;

export default function MarksPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canEnter = canWriteOperations(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('marks.title')}
      description={t('marks.description')}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {canEnter ? (
          <Button size="sm" asChild>
            <Link href="/marks/entry">{t('marks.entryTitle')}</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="outline" asChild>
          <Link href="/marks/reports">{t('marks.reportsTitle')}</Link>
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-5">
        <TabsList>
          <TabsTrigger value="list">All marks</TabsTrigger>
          <TabsTrigger value="averages">Averages & rankings</TabsTrigger>
          <TabsTrigger value="audit">Change history</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <MarksYearScopedList<Row> select={SELECT} columns={columns} />
        </TabsContent>
        <TabsContent value="averages">
          <MarksAveragesPanel />
        </TabsContent>
        <TabsContent value="audit">
          <MarksAuditPanel />
        </TabsContent>
      </Tabs>
    </AcadiaPageShell>
  );
}
