'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  allocateFeePayment,
  buildFeePaymentUpdate,
  canDeleteExpenditure,
  canEditExpenditure,
  computeFeeAccountTotals,
  computeSaleTotalMinor,
  DEFAULT_FEE_CURRENCY,
  nextExpenditureStatus,
  remainingInstallmentMinor,
  resolveFeePlanStream,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import type {
  CreateStudentFeeAccountValues,
  ExpenditureFormValues,
  FinanceSaleFormValues,
  RecordFeePaymentValues,
  StreamFeePlanFormValues,
} from '@/lib/acadia/finance-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { dashboardTags, studentListTags } from '@/lib/acadia/cache/tags';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  ensureStudentFeeAccount,
  provisionMissingFeeAccounts,
} from '@/lib/acadia/fee-account-provision';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

function invalidateFinanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: ['supabase-list'] });
  void queryClient.invalidateQueries({ queryKey: ['supabase-record'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-accounts'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-outstanding'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-budget'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-annual'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-sales'] });
  void queryClient.invalidateQueries({ queryKey: ['finance-expenditures'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-plan'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-plans'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-plan-class-assignments'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-account-installments'] });
  void queryClient.invalidateQueries({ queryKey: ['student-fee-account'] });
  void queryClient.invalidateQueries({ queryKey: ['student-detail'] });
  void queryClient.invalidateQueries({ queryKey: ['missing-fee-accounts'] });
  if (tenantId) {
    invalidateAcadiaCache([...dashboardTags(tenantId), ...studentListTags(tenantId)]);
  }
}

export function useFinanceMutations() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId;
  const userId = session?.profile?.id;

  const saveStreamFeePlan = useMutation({
    mutationFn: async (values: StreamFeePlanFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const totalMinor = sumInstallmentTemplates(values.installments);
      const classIds = Array.from(new Set(values.classIds.filter((id) => id.trim())));
      if (classIds.length === 0) {
        throw new Error('Select at least one class.');
      }

      const { data: classes, error: classError } = await supabase
        .from('Class')
        .select('id, subSystem, branch')
        .eq('tenantId', tenantId)
        .in('id', classIds);
      if (classError) {
        throw classError;
      }
      if ((classes ?? []).length !== classIds.length) {
        throw new Error('One or more selected classes were not found.');
      }
      const stream = resolveFeePlanStream(classes ?? []);

      const { data: taken, error: takenError } = await supabase
        .from('StreamFeePlanClass')
        .select('classId, streamFeePlanId')
        .eq('tenantId', tenantId)
        .eq('academicYearId', values.academicYearId)
        .in('classId', classIds);
      if (takenError) {
        throw takenError;
      }
      const conflicts = (taken ?? []).filter(
        (row) => row.streamFeePlanId !== values.id,
      );
      if (conflicts.length > 0) {
        throw new Error('One or more classes already have a fee plan this year.');
      }

      const payload = {
        academicYearId: values.academicYearId,
        subSystem: stream.subSystem,
        branch: stream.branch,
        installments: values.installments,
        updatedAt: nowIso,
      };

      let planId = values.id?.trim() || '';
      if (planId) {
        const { error } = await supabase
          .from('StreamFeePlan')
          .update(payload)
          .eq('tenantId', tenantId)
          .eq('id', planId);
        if (error) {
          throw error;
        }
        await appendSystemLog(supabase, {
          userId,
          event: 'fee_plan.saved',
          entityId: planId,
          entityType: 'StreamFeePlan',
          description: `Updated fee plan (${formatMinor(totalMinor)})`,
        });
      } else {
        planId = generateAcadiaId('fee-plan');
        const { error } = await supabase.from('StreamFeePlan').insert({
          id: planId,
          tenantId,
          ...payload,
          createdAt: nowIso,
        });
        if (error) {
          throw error;
        }
        await appendSystemLog(supabase, {
          userId,
          event: 'fee_plan.saved',
          entityId: planId,
          entityType: 'StreamFeePlan',
          description: `Created fee plan (${formatMinor(totalMinor)})`,
        });
      }

      const { data: existingAssign, error: assignError } = await supabase
        .from('StreamFeePlanClass')
        .select('id, classId')
        .eq('tenantId', tenantId)
        .eq('streamFeePlanId', planId);
      if (assignError) {
        throw assignError;
      }

      const existingClassIds = new Set(
        (existingAssign ?? []).map((row) => row.classId as string),
      );
      const nextClassIds = new Set(classIds);
      const toDelete = (existingAssign ?? []).filter(
        (row) => !nextClassIds.has(row.classId as string),
      );
      const toInsert = classIds.filter((classId) => !existingClassIds.has(classId));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('StreamFeePlanClass')
          .delete()
          .eq('tenantId', tenantId)
          .in(
            'id',
            toDelete.map((row) => row.id as string),
          );
        if (error) {
          throw error;
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('StreamFeePlanClass').insert(
          toInsert.map((classId) => ({
            id: generateAcadiaId('fee-plan-class'),
            tenantId,
            streamFeePlanId: planId,
            classId,
            academicYearId: values.academicYearId,
          })),
        );
        if (error) {
          throw error;
        }
      }

      try {
        const provisioned = await provisionMissingFeeAccounts(supabase, {
          academicYearId: values.academicYearId,
        });
        if (provisioned.createdCount > 0 && userId) {
          await appendSystemLog(supabase, {
            userId,
            event: 'fee_accounts.provisioned',
            entityId: planId,
            entityType: 'StreamFeePlan',
            description: `Provisioned ${provisioned.createdCount} missing fee account(s) after saving the fee plan.`,
            meta: { createdCount: provisioned.createdCount },
          });
        }
      } catch (error) {
        console.error('[provisionMissingFeeAccounts]', error);
      }

      return planId;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Fee plan saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteStreamFeePlan = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('StreamFeePlan')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'fee_plan.deleted',
        entityId: id,
        entityType: 'StreamFeePlan',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Fee plan deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createStudentFeeAccount = useMutation({
    mutationFn: async (
      values: CreateStudentFeeAccountValues & {
        redirect?: boolean;
        silent?: boolean;
      },
    ) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const result = await ensureStudentFeeAccount(supabase, {
        tenantId,
        studentProfileId: values.studentProfileId,
        academicYearId: values.academicYearId,
        subSystem: values.subSystem,
        branch: values.branch,
        studentEnrollmentId: values.studentEnrollmentId || '',
        classId: values.classId,
        feeCurrency: values.feeCurrency || DEFAULT_FEE_CURRENCY,
        actorUserId: userId,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      return { accountId: result.accountId, created: result.created };
    },
    onSuccess: (result, variables) => {
      invalidateFinanceQueries(queryClient, tenantId);
      if (!variables.silent) {
        toast.success(
          result.created ? 'Fee account created.' : 'Fee account ready.',
        );
      }
      if (variables.redirect === false) {
        return;
      }
      router.push(`/finance/fees/${result.accountId}`);
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const generateMissingFeeAccounts = useMutation({
    mutationFn: async (academicYearId: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const result = await provisionMissingFeeAccounts(supabase, {
        academicYearId,
      });
      if (result.createdCount > 0) {
        await appendSystemLog(supabase, {
          userId,
          event: 'fee_accounts.provisioned',
          entityType: 'StudentFeeAccount',
          description: `Generated ${result.createdCount} missing fee account(s).`,
          meta: { createdCount: result.createdCount, academicYearId },
        });
      }
      return result.createdCount;
    },
    onSuccess: (createdCount) => {
      invalidateFinanceQueries(queryClient, tenantId);
      if (createdCount > 0) {
        toast.success(
          createdCount === 1
            ? 'Created 1 missing fee account.'
            : `Created ${createdCount} missing fee accounts.`,
        );
      } else {
        toast.success('All enrolled students already have fee accounts.');
      }
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const recordFeePayment = useMutation({
    mutationFn: async (values: RecordFeePaymentValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();

      const { data: installment, error: fetchError } = await supabase
        .from('StudentFeeInstallment')
        .select('id, amountMinor, paidAmountMinor, status, studentFeeAccountId')
        .eq('tenantId', tenantId)
        .eq('id', values.installmentId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!installment) {
        throw new Error('Installment not found.');
      }

      const accountId = String(installment.studentFeeAccountId);
      const { data: account, error: accountError } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          totalAmountMinor,
          creditMinor,
          StudentFeeInstallment (
            id,
            installmentNumber,
            amountMinor,
            paidAmountMinor,
            status
          ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId)
        .eq('id', accountId)
        .maybeSingle();
      if (accountError) {
        throw accountError;
      }
      if (!account) {
        throw new Error('Fee account not found.');
      }

      const installments = (
        account.StudentFeeInstallment ?? []
      ) as Array<{
        id: string;
        installmentNumber: number;
        amountMinor: number;
        paidAmountMinor: number | null;
        status: string;
      }>;
      const scholarships = (account.StudentScholarship ?? []) as Array<{
        discountMinor: number;
      }>;
      const scholarshipMinor = scholarships.reduce(
        (sum, row) => sum + Number(row.discountMinor ?? 0),
        0,
      );
      const totals = computeFeeAccountTotals({
        totalAmountMinor: Number(account.totalAmountMinor),
        scholarshipMinor,
        creditMinor: Number(account.creditMinor ?? 0),
        installments,
      });

      const selected = installments.find((row) => row.id === values.installmentId);
      const amountMinor = selected
        ? Number(selected.amountMinor)
        : Number(installment.amountMinor);
      const thisPayment =
        values.paidAmountMinor != null && values.paidAmountMinor > 0
          ? values.paidAmountMinor
          : remainingInstallmentMinor({
              amountMinor,
              paidAmountMinor: (selected?.paidAmountMinor ??
                installment.paidAmountMinor) as number | null,
              status: String(selected?.status ?? installment.status),
            });

      const allocation = allocateFeePayment({
        selectedInstallmentId: values.installmentId,
        paymentMinor: thisPayment,
        installments,
        accountRemainingMinor: totals.balanceMinor,
      });
      if (allocation.appliedMinor <= 0) {
        throw new Error('No remaining school fees to apply this payment to.');
      }

      for (const row of allocation.updates) {
        const isSelected = row.id === values.installmentId;
        const update = isSelected
          ? buildFeePaymentUpdate(
              {
                ...values,
                amountMinor,
                paidAmountMinor: row.paidAmountMinor,
              },
              userId,
              nowIso,
            )
          : {
              status: row.status,
              paidAmountMinor: row.paidAmountMinor,
              paidAt: nowIso,
              updatedByUserId: userId,
              updatedAt: nowIso,
            };

        const { error } = await supabase
          .from('StudentFeeInstallment')
          .update(update)
          .eq('tenantId', tenantId)
          .eq('id', row.id);
        if (error) {
          throw error;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'fee_payment.recorded',
        entityId: values.installmentId,
        entityType: 'StudentFeeInstallment',
        meta: {
          studentFeeAccountId: accountId,
          appliedMinor: allocation.appliedMinor,
          installmentCount: allocation.updates.length,
        },
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Payment recorded.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createSale = useMutation({
    mutationFn: async (values: FinanceSaleFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('sale');
      const totalMinor = computeSaleTotalMinor(
        values.quantity,
        values.unitPriceMinor,
      );
      const { error } = await supabase.from('FinanceSale').insert({
        id,
        tenantId,
        academicYearId: values.academicYearId,
        studentProfileId: values.studentProfileId,
        itemType: values.itemType,
        itemName: values.itemName.trim(),
        quantity: values.quantity,
        unitPriceMinor: values.unitPriceMinor,
        totalMinor,
        saleDate: values.saleDate,
        status: values.status ?? 'COMPLETED',
        notes: values.notes?.trim() || null,
        createdByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_sale.created',
        entityId: id,
        entityType: 'FinanceSale',
        description: `${values.itemName.trim()} (${formatMinor(totalMinor)})`,
      });
      return id;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Sale recorded.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateSale = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: FinanceSaleFormValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const totalMinor = computeSaleTotalMinor(
        values.quantity,
        values.unitPriceMinor,
      );
      const { error } = await supabase
        .from('FinanceSale')
        .update({
          itemType: values.itemType,
          itemName: values.itemName.trim(),
          quantity: values.quantity,
          unitPriceMinor: values.unitPriceMinor,
          totalMinor,
          saleDate: values.saleDate,
          status: values.status ?? 'COMPLETED',
          notes: values.notes?.trim() || null,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_sale.updated',
        entityId: id,
        entityType: 'FinanceSale',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Sale updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { error } = await supabase
        .from('FinanceSale')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_sale.deleted',
        entityId: id,
        entityType: 'FinanceSale',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Sale deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createExpenditure = useMutation({
    mutationFn: async (values: ExpenditureFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('exp');
      const { error } = await supabase.from('Expenditure').insert({
        id,
        tenantId,
        academicYearId: values.academicYearId,
        title: values.title.trim(),
        description: values.description?.trim() || null,
        category: values.category,
        amountMinor: values.amountMinor,
        currency: values.currency || DEFAULT_FEE_CURRENCY,
        paymentMethod: values.paymentMethod,
        paymentDate: values.paymentDate,
        vendor: values.vendor.trim(),
        vendorContact: values.vendorContact?.trim() || null,
        receiptNumber: values.receiptNumber?.trim() || null,
        invoiceNumber: values.invoiceNumber?.trim() || null,
        status: 'PENDING',
        budgetCategory: values.budgetCategory,
        department: values.department?.trim() || null,
        notes: values.notes?.trim() || null,
        createdByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.created',
        entityId: id,
        entityType: 'Expenditure',
        description: `${values.title.trim()} (${formatMinor(values.amountMinor)})`,
      });
      return id;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure recorded.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const updateExpenditure = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: ExpenditureFormValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      if (!canEditExpenditure(String(row.status))) {
        throw new Error('Paid expenditures cannot be edited.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({
          title: values.title.trim(),
          description: values.description?.trim() || null,
          category: values.category,
          amountMinor: values.amountMinor,
          currency: values.currency || DEFAULT_FEE_CURRENCY,
          paymentMethod: values.paymentMethod,
          paymentDate: values.paymentDate,
          vendor: values.vendor.trim(),
          vendorContact: values.vendorContact?.trim() || null,
          receiptNumber: values.receiptNumber?.trim() || null,
          invoiceNumber: values.invoiceNumber?.trim() || null,
          budgetCategory: values.budgetCategory,
          department: values.department?.trim() || null,
          notes: values.notes?.trim() || null,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.updated',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure updated.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteExpenditure = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      if (!canDeleteExpenditure(String(row.status))) {
        throw new Error('Paid expenditures cannot be deleted.');
      }
      const { error } = await supabase
        .from('Expenditure')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.deleted',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const approveExpenditure = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      const next = nextExpenditureStatus('approve', String(row.status));
      if (!next) {
        throw new Error('Only pending expenditures can be approved.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({
          status: next,
          approvedByUserId: userId,
          approvedAt: nowIso,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.approved',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure approved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const markExpenditurePaid = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      const next = nextExpenditureStatus('pay', String(row.status));
      if (!next) {
        throw new Error('Only approved expenditures can be marked paid.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({
          status: next,
          updatedAt: nowIso,
        })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.paid',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure marked paid.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  return {
    saveStreamFeePlan,
    deleteStreamFeePlan,
    createStudentFeeAccount,
    generateMissingFeeAccounts,
    recordFeePayment,
    createSale,
    updateSale,
    deleteSale,
    createExpenditure,
    updateExpenditure,
    deleteExpenditure,
    approveExpenditure,
    markExpenditurePaid,
  };
}

function formatMinor(amountMinor: number): string {
  return `${(amountMinor / 100).toLocaleString()} minor`;
}
