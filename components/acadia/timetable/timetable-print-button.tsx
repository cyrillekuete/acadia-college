'use client';

import { Button } from '@/components/ui/button';
import { Printer } from '@/lib/icons';

export function TimetablePrintButton({
  label = 'Print timetable',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => window.print()}
    >
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
