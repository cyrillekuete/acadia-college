'use client';

import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SubjectForm } from '@/components/acadia/subjects/subject-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewSubjectPage() {
  const { t } = useTranslation();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('subjects.newTitle')}
      description="Add a subject to the catalog for all terms in the academic year."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href="/subjects">
            <ArrowLeft className="size-4" />
            Back to subjects
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !canManage ? (
        <p className="text-sm text-muted-foreground">
          You do not have permission to create subjects.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('subjects.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectForm onCancelHref="/subjects" />
          </CardContent>
        </Card>
      )}
    </AcadiaPageShell>
  );
}
