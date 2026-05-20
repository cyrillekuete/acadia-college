'use client';

import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { SubjectForm } from '@/components/acadia/subjects/subject-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewSubjectPage() {
  return (
    <AcadiaPageShell
      title="New subject"
      description="Add a subject to the catalog with term and Cameroon placement."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href="/subjects">
            <ArrowLeft className="size-4" />
            Back to subjects
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Subject details</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectForm onCancelHref="/subjects" />
        </CardContent>
      </Card>
    </AcadiaPageShell>
  );
}
