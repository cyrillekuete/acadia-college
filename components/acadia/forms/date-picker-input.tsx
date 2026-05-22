'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatLocalDateInputValue,
  parseLocalDateInputValue,
} from '@/lib/acadia/dates';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type DatePickerInputProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Single-date picker (Metronic settings-sidebar pattern: Popover + Calendar).
 * Value is stored as YYYY-MM-DD for native form fields and APIs.
 */
export function DatePickerInput({
  value = '',
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
  id,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateInputValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          mode="input"
          variant="outline"
          id={id}
          disabled={disabled}
          placeholder={!selected}
          className={cn(
            'w-full data-[state=open]:border-primary',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="-ms-0.5 size-4 shrink-0" />
          {selected ? format(selected, 'LLL dd, y') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          initialFocus
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            onChange(date ? formatLocalDateInputValue(date) : '');
            if (date) {
              setOpen(false);
            }
          }}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
