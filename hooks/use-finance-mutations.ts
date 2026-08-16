'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  buildFeeInstallmentRows,
  buildFeePaymentUpdate,
  canDeleteExpenditure,
  canEditExpenditure,
  computeSaleTotalMinor,
  DEFAULT_FEE_CURRENCY,
  nextExpenditureStatus,
  sumInstallmentTemplates,
} from '@/lib/acadia/finance';
import type {
  CreateStudentFeeAccountValues,
  ExpenditureFormValues,
  FinanceBudgetLineFormValues,
  FinanceLedgerEntryFormValues,
  FinanceSaleFormValues,
  RecordFeePaymentValues,
  StreamFeePlanFormValues,
} from '@/lib/acadia/finance-schemas';
import { generateAcadiaId } from '@/lib/acadia/ids';
import { appendSystemLog } from '@/lib/acadia/system-log';
import { invalidateAcadiaCache } from '@/lib/acadia/cache/invalidate-client';
import { dashboardTags, studentListTags } from '@/lib/acadia/cache/tags';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

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
      const firstClass =
        (classes ?? []).find((row) => row.id === classIds[0]) ?? (classes ?? [])[0];
      if (!firstClass) {
        throw new Error('Select at least one class.');
      }

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
        subSystem: firstClass.subSystem,
        branch: firstClass.branch,
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
    mutationFn: async (values: CreateStudentFeeAccountValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      let installments: Parameters<typeof sumInstallmentTemplates>[0] = [];
      let totalAmountMinor = 0;

      if (values.useStreamPlan !== false) {
        const classId = values.classId?.trim();
        if (!classId) {
          throw new Error('Student is not assigned to a class.');
        }
        const { data: assignment, error: planError } = await supabase
          .from('StreamFeePlanClass')
          .select(
            `
            streamFeePlanId,
            StreamFeePlan!StreamFeePlanClass_streamFeePlanId_tenantId_fkey (
              installments
            )
          `,
          )
          .eq('tenantId', tenantId)
          .eq('academicYearId', values.academicYearId)
          .eq('classId', classId)
          .maybeSingle();
        if (planError) {
          throw planError;
        }
        const plan = unwrapRelation<{ installments?: unknown }>(
          assignment?.StreamFeePlan,
        );
        if (!plan?.installments || !Array.isArray(plan.installments)) {
          throw new Error('No fee plan for this class. Set up a plan first.');
        }
        installments = plan.installments as Parameters<
          typeof sumInstallmentTemplates
        >[0];
      }

      totalAmountMinor = sumInstallmentTemplates(installments);
      if (totalAmountMinor <= 0) {
        throw new Error('Fee plan has no installment amounts.');
      }

      const accountId = generateAcadiaId('fee-acct');
      const { error: accountError } = await supabase.from('StudentFeeAccount').insert({
        id: accountId,
        tenantId,
        studentProfileId: values.studentProfileId,
        academicYearId: values.academicYearId,
        subSystem: values.subSystem,
        branch: values.branch,
        studentEnrollmentId: values.studentEnrollmentId || null,
        totalAmountMinor,
        feeCurrency: values.feeCurrency || DEFAULT_FEE_CURRENCY,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (accountError) {
        throw accountError;
      }

      const installmentRows = buildFeeInstallmentRows(
        installments,
        tenantId,
        accountId,
        nowIso,
      );
      const { error: instError } = await supabase
        .from('StudentFeeInstallment')
        .insert(installmentRows);
      if (instError) {
        throw instError;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'fee_account.created',
        entityId: accountId,
        entityType: 'StudentFeeAccount',
        description: `Fee account created (${formatMinor(totalAmountMinor)})`,
      });
      return accountId;
    },
    onSuccess: (accountId) => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Fee account created.');
      router.push(`/finance/fees/${accountId}`);
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
        .select('id, amountMinor, studentFeeAccountId')
        .eq('tenantId', tenantId)
        .eq('id', values.installmentId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (!installment) {
        throw new Error('Installment not found.');
      }

      const update = buildFeePaymentUpdate(
        {
          ...values,
          amountMinor: installment.amountMinor as number,
        },
        userId,
        nowIso,
      );

      const { error } = await supabase
        .from('StudentFeeInstallment')
        .update(update)
        .eq('tenantId', tenantId)
        .eq('id', values.installmentId);
      if (error) {
        throw error;
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'fee_payment.recorded',
        entityId: values.installmentId,
        entityType: 'StudentFeeInstallment',
        meta: { studentFeeAccountId: installment.studentFeeAccountId },
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Payment recorded.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const createLedgerEntry = useMutation({
    mutationFn: async (values: FinanceLedgerEntryFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();
      const id = generateAcadiaId('ledger');
      const { error } = await supabase.from('FinanceLedgerEntry').insert({
        id,
        tenantId,
        academicYearId: values.academicYearId,
        entryType: values.entryType,
        category: values.category,
        description: values.description?.trim() || null,
        amountMinor: values.amountMinor,
        currency: values.currency || DEFAULT_FEE_CURRENCY,
        occurredOn: values.occurredOn,
        createdByUserId: userId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      if (error) {
        throw error;
      }
      await appendSystemLog(supabase, {
        userId,
        event: 'finance_ledger.created',
        entityId: id,
        entityType: 'FinanceLedgerEntry',
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Ledger entry added.');
    },
    onError: (error) => toast.error(mutationErrorMessage(error)),
  });

  const saveBudgetLine = useMutation({
    mutationFn: async (values: FinanceBudgetLineFormValues) => {
      if (!tenantId || !userId) {
        throw new Error('Session required.');
      }
      const supabase = requireBrowserClient();
      const nowIso = new Date().toISOString();

      const { data: existing, error: findError } = await supabase
        .from('FinanceBudgetLine')
        .select('id')
        .eq('tenantId', tenantId)
        .eq('academicYearId', values.academicYearId)
        .eq('category', values.category)
        .maybeSingle();
      if (findError) {
        throw findError;
      }

      const payload = {
        budgetedMinor: values.budgetedMinor,
        currency: values.currency || DEFAULT_FEE_CURRENCY,
        notes: values.notes?.trim() || null,
        updatedAt: nowIso,
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('FinanceBudgetLine')
          .update(payload)
          .eq('tenantId', tenantId)
          .eq('id', existing.id as string);
        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('FinanceBudgetLine').insert({
          id: generateAcadiaId('budget'),
          tenantId,
          academicYearId: values.academicYearId,
          category: values.category,
          ...payload,
          createdAt: nowIso,
        });
        if (error) {
          throw error;
        }
      }

      await appendSystemLog(supabase, {
        userId,
        event: 'finance_budget.saved',
        entityType: 'FinanceBudgetLine',
        description: `${values.category} budget updated`,
      });
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient, tenantId);
      toast.success('Budget line saved.');
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
    recordFeePayment,
    createLedgerEntry,
    saveBudgetLine,
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
