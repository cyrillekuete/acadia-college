'use client';

import { Pencil, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { isAdmin } from '@/lib/acadia/roles';

export function RegistryRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const { data: session } = useAcadiaCollegeSession();
  if (!isAdmin(session?.roleSlug)) {
    return null;
  }

  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
        <Pencil className="size-4" />
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ) : null}
    </div>
  );
}
