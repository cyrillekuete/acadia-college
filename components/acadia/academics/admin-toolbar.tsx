'use client';

import { ReactNode } from 'react';
import { Plus } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { cn } from '@/lib/utils';

export function AdminToolbar({
  onAdd,
  addLabel,
  children,
  className,
  canManage: canManageOverride,
}: {
  onAdd?: () => void;
  addLabel?: string;
  children?: ReactNode;
  className?: string;
  canManage?: boolean;
}) {
  const { data: session } = useAcadiaCollegeSession();
  const canManage =
    canManageOverride ?? canWriteRegistry(session?.roleSlug);

  if (!canManage) {
    return null;
  }

  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-end gap-2', className)}>
      {children}
      {onAdd && addLabel ? (
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
