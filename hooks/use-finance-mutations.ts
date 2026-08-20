'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  allocateFeePayment,
  assertFinanceYearWritable,
  buildFeePaymentUpdate,
  canCancelSale,
  canDeleteExpenditure,
  canDeleteSale,
  canEditExpenditure,
  capScholarshipStack,
  computeFeeAccountTotals,
  computeSaleTotalMinor,
  computeScholarshipDiscountMinor,
  DEFAULT_FEE_CURRENCY,
  nextExpenditureStatus,
  remainingInstallmentMinor,
  resolveFeePlanStream,
  scholarshipMinorFromGrants,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import type {
  CreateStudentFeeAccountValues,
  ExpenditureFormValues,
  FinanceBudgetLineFormValues,
  FinanceLedgerEntryFormValues,
  FinanceSaleFormValues,
  GrantScholarshipValues,
  RecordFeePaymentValues,
  ScholarshipTypeFormValues,
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
  rebillExistingFeeAccountSchedule,
  refreshPercentScholarshipDiscounts,
  applyFeeAccountRebill,
} from '@/lib/acadia/fee-account-provision';

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Operation failed.';
}

async function requireOpenFinanceYear(
  supabase: ReturnType<typeof requireBrowserClient>,
  tenantId: string,
  academicYearId: string,
) {
  const { data, error } = await supabase
    .from('AcademicYear')
    .select('id, isActive')
    .eq('tenantId', tenantId)
    .eq('id', academicYearId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  assertFinanceYearWritable(data);
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
  void queryClient.invalidateQueries({ queryKey: ['scholarship-types'] });
  void queryClient.invalidateQueries({ queryKey: ['fee-account-scholarships'] });
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
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
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
        const removedClassIds = toDelete.map((row) => row.classId as string);
        const { count, error: billedError } = await supabase
          .from('StudentFeeAccount')
          .select('id', { count: 'exact', head: true })
          .eq('tenantId', tenantId)
          .eq('streamFeePlanId', planId)
          .in(
            'studentEnrollmentId',
            (
              await supabase
                .from('StudentEnrollment')
                .select('id')
                .eq('tenantId', tenantId)
                .eq('academicYearId', values.academicYearId)
                .in('classId', removedClassIds)
            ).data?.map((row) => row.id as string) ?? ['__none__'],
          );
        if (billedError) {
          throw billedError;
        }
        if ((count ?? 0) > 0) {
          throw new Error(
            'Cannot remove classes that still have billed students.',
          );
        }
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
        const { data: billed } = await supabase
          .from('StudentFeeAccount')
          .select(
            `
            id,
            StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
            StudentScholarship ( discountMinor )
          `,
          )
          .eq('tenantId', tenantId)
          .eq('streamFeePlanId', planId);
        let rebilledCount = 0;
        for (const account of billed ?? []) {
          const paidMinor = computeFeeAccountTotals({
            totalAmountMinor: 0,
            installments: (account.StudentFeeInstallment ?? []) as Array<{
              amountMinor: number;
              status: string;
              paidAmountMinor: number | null;
            }>,
          }).totalPaidMinor;
          const scholarshipMinor = await refreshPercentScholarshipDiscounts(
            supabase,
            {
              tenantId,
              accountId: String(account.id),
              totalAmountMinor: totalMinor,
            },
          );
          await applyFeeAccountRebill(supabase, {
            tenantId,
            accountId: String(account.id),
            streamFeePlanId: planId,
            subSystem: stream.subSystem,
            branch: stream.branch,
            enrollmentId: '',
            templates: values.installments,
            paidMinor,
            scholarshipMinor,
            nowIso,
          });
          rebilledCount += 1;
        }
        if (rebilledCount > 0 && userId) {
          await appendSystemLog(supabase, {
            userId,
            event: 'fee_account.rebilled',
            entityId: planId,
            entityType: 'StreamFeePlan',
            description: `Rebilled ${rebilledCount} account(s) after saving the fee plan.`,
            meta: { rebilledCount },
          });
        }
      } catch (error) {
        console.error('[rebillAccountsForPlan]', error);
        throw error;
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
      const { count, error: countError } = await supabase
        .from('StudentFeeAccount')
        .select('id', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .eq('streamFeePlanId', id);
      if (countError) {
        throw countError;
      }
      if ((count ?? 0) > 0) {
        throw new Error(
          `This plan still has ${count} student account(s). Reassign or rebill them before deleting.`,
        );
      }
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
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
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
      await requireOpenFinanceYear(supabase, tenantId, academicYearId);
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
          academicYearId,
          totalAmountMinor,
          creditMinor,
          withdrawnAt,
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
      if (account.withdrawnAt) {
        throw new Error('This fee account is frozen because the student withdrew.');
      }
      await requireOpenFinanceYear(supabase, tenantId, String(account.academicYearId));

      const installments = (
        account.StudentFeeInstallment ?? []
      ) as Array<{
        id: string;
        installmentNumber: number;
        amountMinor: number;
        paidAmountMinor: number | null;
        status: string;
      }>;
      const scholarshipMinor = scholarshipMinorFromGrants(account.StudentScholarship);
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

      const updates = allocation.updates.map((row) => {
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
        return { id: row.id, ...update };
      });

      const { error: applyError } = await supabase.rpc(
        'acadia_apply_fee_installment_updates',
        {
          p_account_id: accountId,
          p_updates: updates,
        },
      );
      if (applyError) {
        throw applyError;
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
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
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
        studentProfileId: values.studentProfileId?.trim() || null,
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
      const { data: existing, error: existingError } = await supabase
        .from('FinanceSale')
        .select('id, academicYearId, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (existingError) {
        throw existingError;
      }
      if (!existing) {
        throw new Error('Sale not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(existing.academicYearId),
      );
      const nowIso = new Date().toISOString();
      const currentStatus = String(existing.status);
      if (currentStatus === 'COMPLETED') {
        const { error } = await supabase
          .from('FinanceSale')
          .update({
            notes: values.notes?.trim() || null,
            updatedAt: nowIso,
          })
          .eq('tenantId', tenantId)
          .eq('id', id);
        if (error) {
          throw error;
        }
      } else {
        const totalMinor = computeSaleTotalMinor(
          values.quantity,
          values.unitPriceMinor,
        );
        const { error } = await supabase
          .from('FinanceSale')
          .update({
            studentProfileId: values.studentProfileId?.trim() || null,
            itemType: values.itemType,
            itemName: values.itemName.trim(),
            quantity: values.quantity,
            unitPriceMinor: values.unitPriceMinor,
            totalMinor,
            saleDate: values.saleDate,
            status: values.status ?? currentStatus,
            notes: values.notes?.trim() || null,
            updatedAt: nowIso,
          })
          .eq('tenantId', tenantId)
          .eq('id', id);
        if (error) {
          throw error;
        }
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
      const { data: existing, error: existingError } = await supabase
        .from('FinanceSale')
        .select('id, academicYearId, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (existingError) {
        throw existingError;
      }
      if (!existing) {
        throw new Error('Sale not found.');
      }
      if (!canDeleteSale(String(existing.status))) {
        throw new Error('Only pending sales can be deleted. Cancel completed sales instead.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(existing.academicYearId),
      );
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
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
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
        paymentMethod: values.paymentMethod ?? null,
        paymentDate: values.paymentDate?.trim() || null,
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
        .select('id, status, academicYearId')
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
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({
          title: values.title.trim(),
          description: values.description?.trim() || null,
          category: values.category,
          amountMinor: values.amountMinor,
          currency: values.currency || DEFAULT_FEE_CURRENCY,
          paymentMethod: values.paymentMethod ?? null,
          paymentDate: values.paymentDate?.trim() || null,
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
        .select('id, status, academicYearId')
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
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
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
        .select('id, status, academicYearId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
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
        .select('id, status, academicYearId, paymentDate')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const next = nextExpenditureStatus('pay', String(row.status));
      if (!next) {
        throw new Error('Only approved expenditures can be marked paid.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({
          status: next,
          paymentDate: row.paymentDate || nowIso.slice(0, 10),
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

  const rejectExpenditure = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status, academicYearId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const next = nextExpenditureStatus('reject', String(row.status));
      if (!next) {
        throw new Error('This expenditure cannot be rejected.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({ status: next, updatedAt: nowIso })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.rejected',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure rejected.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const reopenExpenditure = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('Expenditure')
        .select('id, status, academicYearId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Expenditure not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const next = nextExpenditureStatus('reopen', String(row.status));
      if (!next) {
        throw new Error('Only rejected expenditures can be reopened.');
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('Expenditure')
        .update({ status: next, updatedAt: nowIso })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'expenditure.reopened',
        entityId: id,
        entityType: 'Expenditure',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Expenditure reopened.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const cancelSale = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: existing, error: existingError } = await supabase
        .from('FinanceSale')
        .select('id, academicYearId, status')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (existingError) {
        throw existingError;
      }
      if (!existing) {
        throw new Error('Sale not found.');
      }
      if (!canCancelSale(String(existing.status))) {
        throw new Error('This sale cannot be cancelled.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(existing.academicYearId),
      );
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('FinanceSale')
        .update({ status: 'CANCELLED', updatedAt: nowIso })
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_sale.cancelled',
        entityId: id,
        entityType: 'FinanceSale',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Sale cancelled.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveLedgerEntry = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: FinanceLedgerEntryFormValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
      const nowIso = new Date().toISOString();
      const payload = {
        academicYearId: values.academicYearId,
        entryType: values.entryType,
        category: values.category.trim(),
        description: values.description?.trim() || null,
        amountMinor: values.amountMinor,
        currency: values.currency || DEFAULT_FEE_CURRENCY,
        occurredOn: values.occurredOn,
        updatedAt: nowIso,
      };
      if (id) {
        const { error } = await supabase
          .from('FinanceLedgerEntry')
          .update(payload)
          .eq('tenantId', tenantId)
          .eq('id', id);
        if (error) {
          throw error;
        }
        await appendSystemLog(supabase, {
          userId,
          event: 'finance_ledger.updated',
          entityId: id,
          entityType: 'FinanceLedgerEntry',
        });
        return id;
      }
      const entryId = generateAcadiaId('ledger');
      const { error } = await supabase.from('FinanceLedgerEntry').insert({
        id: entryId,
        tenantId,
        createdByUserId: userId,
        createdAt: nowIso,
        ...payload,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_ledger.created',
        entityId: entryId,
        entityType: 'FinanceLedgerEntry',
      });
      return entryId;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Ledger entry saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteLedgerEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('FinanceLedgerEntry')
        .select('id, academicYearId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Ledger entry not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const { error } = await supabase
        .from('FinanceLedgerEntry')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_ledger.deleted',
        entityId: id,
        entityType: 'FinanceLedgerEntry',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Ledger entry deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveBudgetLine = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: FinanceBudgetLineFormValues;
    }) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      await requireOpenFinanceYear(supabase, tenantId, values.academicYearId);
      const nowIso = new Date().toISOString();
      const payload = {
        academicYearId: values.academicYearId,
        category: values.category,
        budgetedMinor: values.budgetedMinor,
        currency: values.currency || DEFAULT_FEE_CURRENCY,
        notes: values.notes?.trim() || null,
        updatedAt: nowIso,
      };
      if (id) {
        const { error } = await supabase
          .from('FinanceBudgetLine')
          .update(payload)
          .eq('tenantId', tenantId)
          .eq('id', id);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('FinanceBudgetLine').upsert(
          {
            id: generateAcadiaId('budget'),
            tenantId,
            createdAt: nowIso,
            ...payload,
          },
          { onConflict: 'tenantId,academicYearId,category' },
        );
        if (error) {
          throw error;
        }
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_budget.saved',
        entityId: id ?? values.category,
        entityType: 'FinanceBudgetLine',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Budget line saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteBudgetLine = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: row, error: fetchError } = await supabase
        .from('FinanceBudgetLine')
        .select('id, academicYearId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!row) {
        throw new Error('Budget line not found.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(row.academicYearId),
      );
      const { error } = await supabase
        .from('FinanceBudgetLine')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_budget.deleted',
        entityId: id,
        entityType: 'FinanceBudgetLine',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Budget line deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveScholarshipType = useMutation({
    mutationFn: async (values: ScholarshipTypeFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const payload = {
        nameEn: values.nameEn.trim(),
        nameFr: values.nameFr.trim(),
        discountKind: values.discountKind,
        percentBps:
          values.discountKind === 'PERCENT_BPS' ? values.percentBps ?? null : null,
        fixedAmountMinor:
          values.discountKind === 'FIXED_MINOR'
            ? values.fixedAmountMinor ?? null
            : null,
        isActive: values.isActive,
        updatedAt: nowIso,
      };
      if (values.id) {
        const { error } = await supabase
          .from('ScholarshipType')
          .update(payload)
          .eq('tenantId', tenantId)
          .eq('id', values.id);
        if (error) {
          throw error;
        }
        await appendSystemLog(supabase, {
          userId,
          event: 'scholarship_type.saved',
          entityId: values.id,
          entityType: 'ScholarshipType',
        });
        return values.id;
      }
      const typeId = generateAcadiaId('schol-type');
      const { error } = await supabase.from('ScholarshipType').insert({
        id: typeId,
        tenantId,
        createdAt: nowIso,
        ...payload,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'scholarship_type.saved',
        entityId: typeId,
        entityType: 'ScholarshipType',
      });
      return typeId;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Scholarship type saved.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const deleteScholarshipType = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { count, error: countError } = await supabase
        .from('StudentScholarship')
        .select('id', { count: 'exact', head: true })
        .eq('tenantId', tenantId)
        .eq('scholarshipTypeId', id);
      if (countError) {
        throw countError;
      }
      if ((count ?? 0) > 0) {
        throw new Error(
          `This type is granted on ${count} student account(s). Revoke those grants first.`,
        );
      }
      const { error } = await supabase
        .from('ScholarshipType')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'scholarship_type.deleted',
        entityId: id,
        entityType: 'ScholarshipType',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Scholarship type deleted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const grantScholarship = useMutation({
    mutationFn: async (values: GrantScholarshipValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: account, error: accountError } = await supabase
        .from('StudentFeeAccount')
        .select(
          `
          id,
          academicYearId,
          totalAmountMinor,
          withdrawnAt,
          StudentFeeInstallment ( amountMinor, status, paidAmountMinor ),
          StudentScholarship ( discountMinor )
        `,
        )
        .eq('tenantId', tenantId)
        .eq('id', values.studentFeeAccountId)
        .maybeSingle();
      if (accountError) {
        throw accountError;
      }
      if (!account) {
        throw new Error('Fee account not found.');
      }
      if (account.withdrawnAt) {
        throw new Error('This fee account is frozen because the student withdrew.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(account.academicYearId),
      );

      const { data: type, error: typeError } = await supabase
        .from('ScholarshipType')
        .select('id, discountKind, percentBps, fixedAmountMinor, isActive')
        .eq('tenantId', tenantId)
        .eq('id', values.scholarshipTypeId)
        .maybeSingle();
      if (typeError) {
        throw typeError;
      }
      if (!type || type.isActive === false) {
        throw new Error('Scholarship type is not available.');
      }

      const waivedMinor = computeFeeAccountTotals({
        totalAmountMinor: Number(account.totalAmountMinor),
        installments: (account.StudentFeeInstallment ?? []) as Array<{
          amountMinor: number;
          status: string;
          paidAmountMinor: number | null;
        }>,
      }).waivedMinor;
      const existing = scholarshipMinorFromGrants(account.StudentScholarship);
      const computed = computeScholarshipDiscountMinor({
        discountKind: String(type.discountKind),
        percentBps: type.percentBps,
        fixedAmountMinor: type.fixedAmountMinor,
        totalAmountMinor: Number(account.totalAmountMinor),
      });
      const stacked = capScholarshipStack(
        [existing, computed],
        Number(account.totalAmountMinor),
        waivedMinor,
      );
      const discountMinor = Math.max(0, stacked - existing);
      if (discountMinor <= 0) {
        throw new Error('Scholarship would exceed remaining tuition.');
      }

      const grantId = generateAcadiaId('schol');
      const { error: insertError } = await supabase.from('StudentScholarship').insert({
        id: grantId,
        tenantId,
        studentFeeAccountId: values.studentFeeAccountId,
        scholarshipTypeId: values.scholarshipTypeId,
        discountMinor,
        grantedByUserId: userId,
        createdAt: new Date().toISOString(),
      });
      if (insertError) {
        if (
          typeof insertError === 'object' &&
          insertError &&
          'code' in insertError &&
          (insertError as { code?: string }).code === '23505'
        ) {
          throw new Error('This scholarship type is already granted on this account.');
        }
        throw insertError;
      }

      await rebillExistingFeeAccountSchedule(supabase, {
        tenantId,
        accountId: values.studentFeeAccountId,
      });
      await appendSystemLog(supabase, {
        userId,
        event: 'scholarship.granted',
        entityId: grantId,
        entityType: 'StudentScholarship',
        meta: { studentFeeAccountId: values.studentFeeAccountId, discountMinor },
      });
      return grantId;
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Scholarship granted.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const revokeScholarship = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const { data: grant, error: fetchError } = await supabase
        .from('StudentScholarship')
        .select('id, studentFeeAccountId')
        .eq('tenantId', tenantId)
        .eq('id', id)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!grant) {
        throw new Error('Scholarship grant not found.');
      }
      const accountId = String(grant.studentFeeAccountId);
      const { data: account, error: accountError } = await supabase
        .from('StudentFeeAccount')
        .select('academicYearId, withdrawnAt')
        .eq('tenantId', tenantId)
        .eq('id', accountId)
        .maybeSingle();
      if (accountError) {
        throw accountError;
      }
      if (!account) {
        throw new Error('Fee account not found.');
      }
      if (account.withdrawnAt) {
        throw new Error('This fee account is frozen because the student withdrew.');
      }
      await requireOpenFinanceYear(
        supabase,
        tenantId,
        String(account.academicYearId),
      );
      const { error } = await supabase
        .from('StudentScholarship')
        .delete()
        .eq('tenantId', tenantId)
        .eq('id', id);
      if (error) {
        throw error;
      }
      await rebillExistingFeeAccountSchedule(supabase, {
        tenantId,
        accountId,
      });
      await appendSystemLog(supabase, {
        userId,
        event: 'scholarship.revoked',
        entityId: id,
        entityType: 'StudentScholarship',
        meta: { studentFeeAccountId: accountId },
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Scholarship revoked.');
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
    cancelSale,
    createExpenditure,
    updateExpenditure,
    deleteExpenditure,
    approveExpenditure,
    markExpenditurePaid,
    rejectExpenditure,
    reopenExpenditure,
    saveLedgerEntry,
    deleteLedgerEntry,
    saveBudgetLine,
    deleteBudgetLine,
    saveScholarshipType,
    deleteScholarshipType,
    grantScholarship,
    revokeScholarship,
  };
}

function formatMinor(amountMinor: number): string {
  return `${(amountMinor / 100).toLocaleString()} minor`;
}
