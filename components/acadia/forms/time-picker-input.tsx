'use client';

import { Time } from '@internationalized/date';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateInput, TimeField } from '@/components/ui/datefield';
import { InputAddon, InputGroup } from '@/components/ui/input';

type TimePickerInputProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function parseTimeInputValue(value: string): Time | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return new Time(hour, minute);
}

function formatTimeInputValue(time: Time): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/**
 * Time picker (Metronic settings pattern: InputGroup + Clock + TimeField).
 * Value is stored as HH:mm for native form fields and APIs.
 */
export function TimePickerInput({
  value = '',
  onChange,
  disabled,
  className,
  id,
}: TimePickerInputProps) {
  const selected = parseTimeInputValue(value);

  return (
    <InputGroup className={cn('w-full', className)}>
      <InputAddon mode="icon">
        <Clock3 />
      </InputAddon>
      <TimeField
        id={id}
        hourCycle={24}
        granularity="minute"
        isDisabled={disabled}
        value={selected}
        onChange={(time) => {
          onChange(time ? formatTimeInputValue(time) : '');
        }}
      >
        <DateInput />
      </TimeField>
    </InputGroup>
  );
}
