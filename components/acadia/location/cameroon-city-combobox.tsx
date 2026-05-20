'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { filterCities } from '@/lib/acadia/cameroon-locations';

type CameroonCityComboboxProps = {
  region?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

export function CameroonCityCombobox({
  region,
  value = '',
  onValueChange,
  disabled,
}: CameroonCityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const suggestions = useMemo(
    () => (region ? filterCities(region, query) : []),
    [region, query],
  );

  const isDisabled = disabled || !region;

  const commitValue = (next: string) => {
    onValueChange(next);
    setQuery(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isDisabled}
          className="w-full justify-between font-normal"
        >
          {value || (region ? 'Select or type a city' : 'Select a region first')}
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search city…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && query.trim()) {
                event.preventDefault();
                commitValue(query.trim());
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {query.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => commitValue(query.trim())}
                >
                  Use &quot;{query.trim()}&quot;
                </button>
              ) : (
                'No city found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => commitValue(city)}
                >
                  <Check
                    className={cn(
                      'me-2 size-4',
                      value === city ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
