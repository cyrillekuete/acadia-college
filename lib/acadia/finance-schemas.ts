import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import {
  FEE_BUDGET_CATEGORIES,
  FEE_INSTALLMENT_STATUSES,
  FINANCE_LEDGER_TYPES,
} from '@/lib/acadia/finance';

export const feeInstallmentTemplateSchema = z.object({
  installmentNumber: z.coerce.number().int().min(1),
  labelEn: z.string().min(1, 'validation.required.labelEn'),
  labelFr: z.string().min(1, 'validation.required.labelFr'),
  amountMinor: z.coerce.number().int().min(1, 'validation.amountPositive'),
  dueOn: z.string().min(1, 'validation.required.dueDate'),
});

export type FeeInstallmentTemplateValues = z.infer<
  typeof feeInstallmentTemplateSchema
>;

export const streamFeePlanSchema = z.object({
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'validation.required.subSystem',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'validation.required.branch',
  }),
  installments: z
    .array(feeInstallmentTemplateSchema)
    .min(1, 'validation.required.installment'),
});

export type StreamFeePlanFormValues = z.infer<typeof streamFeePlanSchema>;

export const createStudentFeeAccountSchema = z.object({
  studentProfileId: z.string().min(1, 'validation.required.student'),
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS, {
    required_error: 'validation.required.subSystem',
  }),
  branch: z.enum(ACADEMIC_BRANCHES, {
    required_error: 'validation.required.branch',
  }),
  studentEnrollmentId: z.string().optional().or(z.literal('')),
  feeCurrency: z.string().min(1),
  useStreamPlan: z.boolean().optional(),
});

export type CreateStudentFeeAccountValues = z.infer<
  typeof createStudentFeeAccountSchema
>;

export const recordFeePaymentSchema = z.object({
  installmentId: z.string().min(1),
  amountMinor: z.coerce.number().int().min(1),
  paidAmountMinor: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
});

export type RecordFeePaymentValues = z.infer<typeof recordFeePaymentSchema>;

export const financeLedgerEntrySchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  entryType: z.enum(FINANCE_LEDGER_TYPES),
  category: z.string().min(1, 'validation.required.category'),
  description: z.string().optional().or(z.literal('')),
  amountMinor: z.coerce.number().int().min(1, 'validation.amountPositive'),
  currency: z.string().min(1),
  occurredOn: z.string().min(1, 'validation.required.date'),
});

export type FinanceLedgerEntryFormValues = z.infer<
  typeof financeLedgerEntrySchema
>;

export const financeBudgetLineSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  category: z.enum(FEE_BUDGET_CATEGORIES),
  budgetedMinor: z.coerce
    .number()
    .int()
    .min(0, 'validation.budgetMin'),
  currency: z.string().min(1),
  notes: z.string().optional().or(z.literal('')),
});

export type FinanceBudgetLineFormValues = z.infer<typeof financeBudgetLineSchema>;

export const financeReportFiltersSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
});

export type FinanceReportFiltersValues = z.infer<
  typeof financeReportFiltersSchema
>;

export const feeInstallmentStatusSchema = z.enum(FEE_INSTALLMENT_STATUSES);
