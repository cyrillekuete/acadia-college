'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { MarksAuditPanel } from '@/components/acadia/assessment/marks-audit-panel';
import { MarksAveragesPanel } from '@/components/acadia/assessment/marks-averages-panel';
import { MarksYearScopedList } from '@/components/acadia/assessment/marks-year-scoped-list';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteOperations, isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function MarksPage() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canEnter = canWriteOperations(session?.roleSlug);
  const canOpenGradeReports =
    isAdmin(session?.roleSlug) || isStaffOrTeacher(session?.roleSlug);

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
        {canOpenGradeReports ? (
          <Button size="sm" variant="outline" asChild>
            <Link href="/marks/reports">{t('marks.reportsTitle')}</Link>
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="list" className="space-y-5">
        <TabsList>
          <TabsTrigger value="list">{t('marks.tabList')}</TabsTrigger>
          <TabsTrigger value="averages">{t('marks.tabAverages')}</TabsTrigger>
          <TabsTrigger value="audit">{t('marks.tabAudit')}</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <MarksYearScopedList />
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
