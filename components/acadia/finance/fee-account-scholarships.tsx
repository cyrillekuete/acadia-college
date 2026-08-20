'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinanceMutations } from '@/hooks/use-finance-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { canWriteFinance } from '@/lib/acadia/roles';
import { formatMoneyMinor } from '@/lib/acadia/finance';
import {
  FinanceClosedYearHint,
  useFinanceYearClosed,
} from '@/components/acadia/finance/finance-year-lock';
import { useTranslation } from '@/hooks/useTranslation';

type GrantRow = {
  id: string;
  scholarshipTypeId: string;
  discountMinor: number;
  nameEn: string;
};

export function FeeAccountScholarships({
  accountId,
  readOnly = false,
}: {
  accountId: string;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const canManage = canWriteFinance(session?.roleSlug) && !readOnly;
  const yearClosed = useFinanceYearClosed();
  const { grantScholarship, revokeScholarship } = useFinanceMutations();
  const [typeId, setTypeId] = useState('');

  const grantsQuery = useQuery({
    queryKey: ['fee-account-scholarships', tenantId, accountId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('StudentScholarship')
        .select(
          `
          id,
          discountMinor,
          scholarshipTypeId,
          ScholarshipType!StudentScholarship_scholarshipTypeId_tenantId_fkey (
            nameEn
          )
        `,
        )
        .eq('tenantId', tenantId!)
        .eq('studentFeeAccountId', accountId)
        .order('createdAt');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const type = unwrapRelation<{ nameEn?: string }>(row.ScholarshipType);
        return {
          id: row.id,
          scholarshipTypeId: row.scholarshipTypeId,
          discountMinor: Number(row.discountMinor),
          nameEn: type?.nameEn ?? '—',
        } satisfies GrantRow;
      });
    },
    enabled: isAcadiaTenantQueryEnabled(
      sessionLoading,
      sessionError,
      session,
      tenantId,
    ),
  });

  const typesQuery = useQuery({
    queryKey: ['scholarship-types', tenantId, 'active'],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('ScholarshipType')
        .select('id, nameEn')
        .eq('tenantId', tenantId!)
        .eq('isActive', true)
        .order('nameEn');
      if (error) {
        throw error;
      }
      return data ?? [];
    },
    enabled:
      canManage &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const grantedTypeIds = useMemo(
    () => new Set((grantsQuery.data ?? []).map((row) => row.scholarshipTypeId)),
    [grantsQuery.data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('finance.scholarshipsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FinanceClosedYearHint />
        {grantsQuery.isError ? (
          <p className="text-sm text-destructive">
            {getQueryErrorMessage(grantsQuery.error)}
          </p>
        ) : null}
        {(grantsQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('finance.noScholarships')}</p>
        ) : (
          <ul className="space-y-2">
            {(grantsQuery.data ?? []).map((grant) => (
              <li
                key={grant.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span>
                  {grant.nameEn} — {formatMoneyMinor(grant.discountMinor)}
                </span>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={yearClosed || revokeScholarship.isPending}
                    onClick={() => revokeScholarship.mutate(grant.id)}
                  >
                    {t('finance.revokeScholarship')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2">
            <Select value={typeId} onValueChange={setTypeId} disabled={yearClosed}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={t('finance.grantScholarship')} />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? [])
                  .filter((type) => !grantedTypeIds.has(type.id))
                  .map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.nameEn}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!typeId || yearClosed || grantScholarship.isPending}
              onClick={() => {
                grantScholarship.mutate(
                  {
                    studentFeeAccountId: accountId,
                    scholarshipTypeId: typeId,
                  },
                  { onSuccess: () => setTypeId('') },
                );
              }}
            >
              {t('finance.grantScholarship')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
