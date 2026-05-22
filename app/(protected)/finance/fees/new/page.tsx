'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { CreateFeeAccountForm } from '@/components/acadia/finance/create-fee-account-form';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance } from '@/lib/acadia/roles';

export default function NewFeeAccountPage() {
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);

  if (!canManage) {
    return (
      <AcadiaPageShell title="New fee account" description="Access denied.">
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">Back to fees</Link>
        </Button>
      </AcadiaPageShell>
    );
  }

  return (
    <AcadiaPageShell
      title="New fee account"
      description="Create a student fee account from the stream installment plan."
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/fees">Back to fees</Link>
        </Button>
      </div>
      <CreateFeeAccountForm />
    </AcadiaPageShell>
  );
}
