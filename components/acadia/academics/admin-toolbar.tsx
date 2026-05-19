'use client';

import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { isAdmin } from '@/lib/acadia/roles';

export function AdminToolbar({
  onAdd,
  addLabel,
  children,
}: {
  onAdd?: () => void;
  addLabel?: string;
  children?: ReactNode;
}) {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = isAdmin(session?.roleSlug);

  if (!canManage) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
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
