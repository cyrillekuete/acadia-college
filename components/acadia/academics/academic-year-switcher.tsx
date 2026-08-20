'use client';

import { CalendarCheck } from '@/lib/icons';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function AcademicYearSwitcher({ className }: { className?: string }) {
  const {
    years,
    activeYearId,
    setActiveYearId,
    isLoading,
    isConfigured,
    currentYearId,
  } = useActiveAcademicYear();

  if (isLoading) {
    return (
      <span
        className={cn(
          'text-xs text-muted-foreground',
          className,
        )}
      >
        Academic year…
      </span>
    );
  }

  if (years.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CalendarCheck
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <Select
        value={activeYearId ?? undefined}
        onValueChange={setActiveYearId}
        disabled={!activeYearId}
      >
        <SelectTrigger
          className="h-8 w-[min(11rem,28vw)] border-dashed text-xs"
          aria-label="Academic year"
        >
          <SelectValue placeholder="Academic year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.id} value={year.id}>
              <span className="flex items-center gap-2">
                {year.label}
                {year.isCurrent || year.id === currentYearId ? (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    Current
                  </Badge>
                ) : null}
                {year.isActive === false ? (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Closed
                  </Badge>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isConfigured ? (
        <Badge variant="outline" className="text-[10px]">
          No current year
        </Badge>
      ) : null}
    </div>
  );
}
