'use client';

import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { COUNTRIES } from '@/lib/acadia/countries';

type CountryComboboxProps = {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function CountryCombobox({
  value = '',
  onValueChange,
  disabled,
  className,
}: CountryComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedCountry = COUNTRIES.find(
    (country) => country.name.toLowerCase() === value.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selectedCountry ? (
            <span className="flex min-w-0 items-center gap-2">
              <img
                src={selectedCountry.flag}
                alt=""
                className="size-5 shrink-0 rounded-full"
              />
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select country</span>
          )}
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <ScrollArea viewportClassName="max-h-[300px] [&>div]:block!">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.name}
                    onSelect={() => {
                      onValueChange(country.name === value ? '' : country.name);
                      setOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <img
                        src={country.flag}
                        alt=""
                        className="size-5 rounded-full"
                      />
                      <span className="truncate">{country.name}</span>
                    </span>
                    <Check
                      className={cn(
                        'ms-auto size-4',
                        value === country.name ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
