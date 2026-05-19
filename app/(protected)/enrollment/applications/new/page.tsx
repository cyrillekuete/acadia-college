'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { EnrollmentApplicationForm } from '@/components/acadia/enrollment/enrollment-application-form';
import { AdminToolbar } from '@/components/acadia/academics/admin-toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewEnrollmentApplicationPage() {
  return (
    <AcadiaPageShell
      title="New enrollment application"
      description="Capture applicant demographics and Cameroon sub-system placement."
    >
      <AdminToolbar />
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href="/enrollment/applications">
            <ArrowLeft className="size-4" />
            Back to applications
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Application details</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentApplicationForm onCancelHref="/enrollment/applications" />
        </CardContent>
      </Card>
    </AcadiaPageShell>
  );
}
