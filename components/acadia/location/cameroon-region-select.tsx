'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CAMEROON_REGIONS } from '@/lib/acadia/cameroon-locations';

type CameroonRegionSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function CameroonRegionSelect({
  value,
  onValueChange,
  disabled,
  className,
}: CameroonRegionSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="Select region" />
      </SelectTrigger>
      <SelectContent>
        {CAMEROON_REGIONS.map((region) => (
          <SelectItem key={region} value={region}>
            {region}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
