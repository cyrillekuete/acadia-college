'use client';

import Link from 'next/link';
import { CalendarCheck, LoaderCircleIcon } from '@/lib/icons';
import { useAcademicYearContext } from '@/components/acadia/academics/academic-year-provider';
import { useAcademicYearStructure } from '@/hooks/use-academic-year-structure';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminAcademicYearCard() {
  const {
    currentYear,
    activeYear,
    activeYearId,
    isConfigured,
    isLoading,
    yearCount,
    isViewingCurrentYear,
  } = useAcademicYearContext();
  const { data: structure, isLoading: structureLoading } = useAcademicYearStructure(
    currentYear?.id ?? null,
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading academic year…
        </CardContent>
      </Card>
    );
  }

  if (!isConfigured || !currentYear) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="size-5" />
            Configure academic year
          </CardTitle>
          <CardDescription>
            {yearCount === 0
              ? 'No academic year exists yet. Create one and mark it as current so the rest of the app can use it.'
              : 'No current academic year is set. Open Academic years and set one as current.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/academics/years">
              {yearCount === 0 ? 'Create academic year' : 'Set current year'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const termsPerYear = structure?.termsPerYear ?? currentYear.termsPerYear;
  const sequencesPerYear = structure?.sequencesPerYear ?? currentYear.sequencesPerYear;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="size-5" />
          Academic year
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeYearId && activeYear && !isViewingCurrentYear ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Viewing <strong>{activeYear.label}</strong> in the app (use the header
            selector to switch years).
          </p>
        ) : null}
        {structureLoading ? (
          <p className="text-sm text-muted-foreground">Loading structure…</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {termsPerYear} terms · {sequencesPerYear} sequences per year
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/academics/years">Academic years</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/academics/terms">Terms</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/academics/sequences">Sequences</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
