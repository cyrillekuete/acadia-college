'use client';

import { useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  milestoneDisplayLabel,
  milestoneKindLabel,
  milestonesOnDate,
  type MilestoneRecord,
} from '@/lib/acadia/calendar-milestones';
import { cn } from '@/lib/utils';

function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function AcademicCalendarMonthView({
  milestones,
  className,
}: {
  milestones: MilestoneRecord[];
  className?: string;
}) {
  const milestoneDates = useMemo(
    () =>
      milestones
        .map((row) => row.onDate.slice(0, 10))
        .filter((value, index, all) => all.indexOf(value) === index)
        .map(parseDay),
    [milestones],
  );

  const [selected, setSelected] = useState<Date | undefined>(() => {
    const first = milestoneDates[0];
    return first ?? new Date();
  });

  const selectedKey = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
    : null;

  const selectedMilestones = selectedKey ? milestonesOnDate(milestones, selectedKey) : [];

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]', className)}>
      <div className="rounded-lg border border-border p-3">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ milestone: milestoneDates }}
          modifiersClassNames={{
            milestone:
              '*:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-1.5 *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-primary',
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Days with a dot have at least one milestone.
        </p>
      </div>
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium">
          {selectedKey ? `Milestones on ${selectedKey}` : 'Select a date'}
        </h3>
        {selectedMilestones.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No milestones on this date.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedMilestones.map((row, index) => (
              <li
                key={`${row.kind}-${row.onDate}-${index}`}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <p className="font-medium">{milestoneDisplayLabel(row)}</p>
                <p className="text-xs text-muted-foreground">{milestoneKindLabel(row.kind)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
