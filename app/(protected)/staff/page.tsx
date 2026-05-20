'use client';

import Link from 'next/link';
import { Plus } from '@/lib/icons';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { StaffRegistry } from '@/components/acadia/staff/staff-registry';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';

export default function StaffPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canAdd = canWriteRegistry(session?.roleSlug);

  return (
    <AcadiaPageShell
      title="Staff"
      description="Manage teacher profiles, assignments, and records."
      actions={
        canAdd ? (
          <Button asChild size="sm">
            <Link href="/staff/new">
              <Plus className="size-4" />
              Add staff
            </Link>
          </Button>
        ) : undefined
      }
    >
      <StaffRegistry />
    </AcadiaPageShell>
  );
}
