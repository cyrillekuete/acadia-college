'use client';

import { BookOpen, Pencil, Trash2 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export function RegistryRowActions({
  onEdit,
  onDelete,
  onAssign,
}: {
  onEdit: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
}) {
  const { data: session } = useAcadiaCollegeSession();
  const { t } = useTranslation();
  if (!canWriteRegistry(session?.roleSlug)) {
    return null;
  }

  return (
    <div className="flex justify-end gap-1">
      {onAssign ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAssign}
          aria-label={t('academics.assignToClasses')}
        >
          <BookOpen className="size-4" />
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={t('common.buttons.edit')}>
        <Pencil className="size-4" />
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={t('common.buttons.delete')}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ) : null}
    </div>
  );
}
