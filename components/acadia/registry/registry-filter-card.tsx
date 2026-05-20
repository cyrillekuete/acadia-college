'use client';

import type { ReactNode } from 'react';
import { KeenIcon } from '@/components/keenicons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type RegistryQuickFilter = {
  id: string;
  label: string;
};

export function RegistryFilterCard({
  children,
  quickFilters,
  activeQuickFilter,
  onQuickFilterChange,
  onClearAll,
  hasActiveFilters,
}: {
  children: ReactNode;
  quickFilters?: RegistryQuickFilter[];
  activeQuickFilter?: string | null;
  onQuickFilterChange?: (id: string | null) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <KeenIcon icon="setting-2" className="text-lg text-muted-foreground" aria-hidden />
          Filters
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearAll}
          disabled={!hasActiveFilters}
        >
          Clear All Filters
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {quickFilters && quickFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-sm font-medium">Quick Filters:</span>
            {quickFilters.map((chip) => {
              const isActive = activeQuickFilter === chip.id;
              return (
                <Button
                  key={chip.id}
                  type="button"
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                  className={cn('h-8', isActive && 'ring-2 ring-primary/30')}
                  onClick={() =>
                    onQuickFilterChange?.(isActive ? null : chip.id)
                  }
                >
                  {chip.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
