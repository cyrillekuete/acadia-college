'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  countryRequiresRegion,
  getRegionsForCountry,
} from '@/lib/acadia/locations';

type RegionSelectProps = {
  country?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function RegionSelect({
  country,
  value,
  onValueChange,
  disabled,
  className,
}: RegionSelectProps) {
  const regions = useMemo(
    () => (country ? getRegionsForCountry(country) : []),
    [country],
  );

  const requiresRegion = country ? countryRequiresRegion(country) : false;
  const isDisabled = disabled || !country || !requiresRegion;

  const placeholder = !country
    ? 'Select country first'
    : requiresRegion
      ? 'Select region'
      : 'No regions for this country';

  return (
    <Select
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={isDisabled}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {regions.map((region) => (
          <SelectItem key={region.value} value={region.value}>
            {region.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
