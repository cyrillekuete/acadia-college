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
import type { TenantUserOption } from '@/hooks/use-tenant-user-options';

export function TenantUserPicker({
  users,
  value,
  onValueChange,
  disabled,
  loading,
  placeholder = 'Select user',
  searchPlaceholder = 'Search people…',
  emptyLabel = 'No matching users.',
}: {
  users: TenantUserOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((user) => user.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {loading
              ? 'Loading…'
              : selected
                ? `${selected.name}${selected.roleSlug ? ` (${selected.roleSlug})` : ''}`
                : placeholder}
          </span>
          <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <ScrollArea viewportClassName="max-h-[300px] [&>div]:block!">
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.roleSlug ?? ''} ${user.email ?? ''}`}
                    onSelect={() => {
                      onValueChange(user.id);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {user.name}
                      {user.roleSlug ? ` (${user.roleSlug})` : ''}
                    </span>
                    <Check
                      className={cn(
                        'ms-auto size-4',
                        value === user.id ? 'opacity-100' : 'opacity-0',
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
