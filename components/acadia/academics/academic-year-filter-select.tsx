'use client';

import { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';

export function AcademicYearFilterSelect({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (yearId: string) => void;
  className?: string;
}) {
  const { data: years = [], isLoading } = useAcademicYearOptions();

  useEffect(() => {
    if (value || years.length === 0) {
      return;
    }
    const current = years.find((y) => y.isCurrent);
    onValueChange(current?.id ?? years[0].id);
  }, [years, value, onValueChange]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={isLoading || years.length === 0}>
      <SelectTrigger className={className ?? 'w-full max-w-xs'}>
        <SelectValue placeholder={isLoading ? 'Loading years…' : 'Select academic year'} />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y.id} value={y.id}>
            {y.label}
            {y.isCurrent ? ' (current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
