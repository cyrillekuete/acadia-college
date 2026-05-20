'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  countryRequiresRegion,
  filterCities,
} from '@/lib/acadia/locations';

type CityAutocompleteProps = {
  country?: string;
  region?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function CityAutocomplete({
  country,
  region,
  value = '',
  onValueChange,
  disabled,
  className,
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const needsRegion = country ? countryRequiresRegion(country) : false;
  const isReady = Boolean(country?.trim()) && (!needsRegion || Boolean(region?.trim()));
  const isDisabled = disabled || !isReady;

  const suggestions = useMemo(
    () => (isReady ? filterCities(country!, region, query) : []),
    [country, region, query, isReady],
  );

  const showCustomOption =
    query.trim().length > 0 &&
    !suggestions.some((city) => city.toLowerCase() === query.trim().toLowerCase());

  const options = showCustomOption
    ? [...suggestions, `Use "${query.trim()}"`]
    : suggestions;

  const commitValue = (next: string) => {
    const trimmed = next.startsWith('Use "') && next.endsWith('"')
      ? query.trim()
      : next;
    onValueChange(trimmed);
    setQuery(trimmed);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const placeholder = !country
    ? 'Select country first'
    : needsRegion && !region
      ? 'Select region first'
      : 'Type to search city…';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <Input
        value={query}
        disabled={isDisabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          if (isReady) {
            setOpen(true);
          }
        }}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onValueChange(next);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightIndex((index) =>
              index < options.length - 1 ? index + 1 : index,
            );
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightIndex((index) => (index > 0 ? index - 1 : -1));
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            if (highlightIndex >= 0 && options[highlightIndex]) {
              commitValue(options[highlightIndex]);
            } else if (query.trim()) {
              commitValue(query.trim());
            }
            return;
          }

          if (event.key === 'Escape') {
            setOpen(false);
            setHighlightIndex(-1);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              setOpen(false);
              setHighlightIndex(-1);
            }
          }, 150);
        }}
      />

      {open && isReady && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((option, index) => {
            const isCustom = option.startsWith('Use "');
            const label = isCustom ? option : option;
            return (
              <li
                key={`${option}-${index}`}
                role="option"
                aria-selected={highlightIndex === index}
                className={cn(
                  'cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                  highlightIndex === index && 'bg-accent text-accent-foreground',
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitValue(option);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
