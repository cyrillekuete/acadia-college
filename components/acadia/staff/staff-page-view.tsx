'use client';

import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StaffRegistry } from '@/components/acadia/staff/staff-registry';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteRegistry } from '@/lib/acadia/roles';
import type { DummyStaff } from '@/lib/acadia/dummy-staff';

export function StaffPageView({
  initialStaff,
  seedYearId,
}: {
  initialStaff?: DummyStaff[];
  seedYearId?: string | null;
}) {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  return (
    <AcadiaPageShell
      title={t('staff.title')}
      description={t('staff.description')}
      actions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/staff/new">
              <Plus className="size-4" />
              {t('staff.add')}
            </Link>
          </Button>
        ) : undefined
      }
    >
      <StaffRegistry initialStaff={initialStaff} seedYearId={seedYearId} />
    </AcadiaPageShell>
  );
}
