'use client';

import Link from 'next/link';
import { ArrowLeft } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CourseForm } from '@/components/acadia/courses/course-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewCoursePage() {
  return (
    <AcadiaPageShell
      title="New course"
      description="Add a course to the catalog with term and Cameroon placement."
    >
      <div className="mb-5">
        <Button variant="outline" size="sm" asChild>
          <Link href="/courses">
            <ArrowLeft className="size-4" />
            Back to courses
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm onCancelHref="/courses" />
        </CardContent>
      </Card>
    </AcadiaPageShell>
  );
}
