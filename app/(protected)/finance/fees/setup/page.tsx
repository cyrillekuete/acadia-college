'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { FeePlanSetupForm } from '@/components/acadia/finance/fee-plan-setup-form';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';

export default function FeePlanSetupPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);

  if (!canManage) {
    return (
      <AcadiaPageShell
        title="Fee plan setup"
        description="Administrator or bursar access required."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">Back to fees</Link>
        </Button>
      </AcadiaPageShell>
    );
  }

  return (
    <AcadiaPageShell
      title="Tuition fee plans"
      description="Configure installment schedules per sub-system and branch (FR-6.1.1)."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">Back to fees</Link>
        </Button>
      </div>
      <FeePlanSetupForm />
    </AcadiaPageShell>
  );
}
