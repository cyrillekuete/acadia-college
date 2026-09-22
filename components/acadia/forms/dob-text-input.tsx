'use client';

import { cn } from '@/lib/utils';
import { formatDobWhileTyping } from '@/lib/acadia/dates';
import { Input } from '@/components/ui/input';

type DobTextInputProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function DobTextInput({
  value = '',
  onChange,
  placeholder = 'DD-MM-YYYY',
  disabled,
  className,
  id,
}: DobTextInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      disabled={disabled}
      placeholder={placeholder}
      className={cn('w-full', className)}
      value={value}
      onChange={(event) => {
        onChange(formatDobWhileTyping(event.target.value));
      }}
    />
  );
}
