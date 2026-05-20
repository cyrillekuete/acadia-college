'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck } from '@/lib/icons';
import { useAcademicYearContext } from '@/components/acadia/academics/academic-year-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EXEMPT_PATH_PREFIXES = [
  '/academics/years',
  '/academics/terms',
  '/academics/sequences',
  '/dashboard/admin',
  '/account/',
  '/admin/users',
  '/user-management/',
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AcademicYearGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConfigured, isLoading, hasAnyYear, activeYearId } = useAcademicYearContext();

  if (isLoading || isExemptPath(pathname)) {
    return <>{children}</>;
  }

  if (isConfigured || (hasAnyYear && activeYearId)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5" />
            Academic year required
          </CardTitle>
          <CardDescription>
            {hasAnyYear
              ? 'Select an academic year in the header to work in the app. Mark a year as current under Academic years for day-to-day operations.'
              : 'Create at least one academic year under Academic structure. Then use the header selector to view current or historical years.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/academics/years">Configure academic years</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
