'use client';

import Link from 'next/link';
import type { CalendarWindowResult } from '@/lib/acadia/calendar-milestones';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CalendarWindowGate({
  featureLabel,
  window,
  loading,
  bypass,
  children,
}: {
  featureLabel: string;
  window: CalendarWindowResult | undefined;
  loading?: boolean;
  bypass?: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Checking academic calendar windows…</p>
    );
  }

  if (bypass || !window || window.allowed) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{featureLabel} is not open</CardTitle>
        <CardDescription>
          {window.message ??
            'The current date is outside the configured window for this academic year.'}
          {window.opensOn ? (
            <>
              {' '}
              Window: {window.opensOn}
              {window.closesOn ? ` → ${window.closesOn}` : ''}.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/academics/calendar">View calendar milestones</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/academics/years">Academic years</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
