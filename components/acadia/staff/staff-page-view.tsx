'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { DeletedStaffSection } from '@/components/acadia/registry/deleted-staff-section';
import {
  RegistrySectionTabs,
  type RegistrySection,
} from '@/components/acadia/registry/registry-section-tabs';
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
  const canManageRecords = canWriteRegistry(session?.roleSlugs);
  const canAdd = canManageRecords || session?.roleSlugs.includes('secretary') === true;
  const [section, setSection] = useState<RegistrySection>('directory');
  const showingDirectory = !canManageRecords || section === 'directory';

  return (
    <AcadiaPageShell
      title={t('staff.title')}
      description={t('staff.description')}
      actions={
        canAdd && showingDirectory ? (
          <Button asChild size="sm">
            <Link href="/staff/new">
              <Plus className="size-4" />
              {t('staff.add')}
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-7.5">
        {canManageRecords ? (
          <RegistrySectionTabs value={section} onChange={setSection} />
        ) : null}
        {showingDirectory ? (
          <StaffRegistry initialStaff={initialStaff} seedYearId={seedYearId} />
        ) : (
          <DeletedStaffSection />
        )}
      </div>
    </AcadiaPageShell>
  );
}
