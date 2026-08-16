import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import {
  EXPENDITURE_CATEGORIES,
  EXPENDITURE_STATUSES,
  FEE_BUDGET_CATEGORIES,
  FEE_INSTALLMENT_STATUSES,
  FINANCE_LEDGER_TYPES,
  FINANCE_PAYMENT_METHODS,
  FINANCE_SALE_ITEM_TYPES,
  FINANCE_SALE_STATUSES,
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
  id: z.string().optional(),
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  classIds: z
    .array(z.string().min(1))
    .min(1, 'validation.required.classes'),
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
  classId: z.string().optional().or(z.literal('')),
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

export const financeSaleSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  studentProfileId: z.string().min(1, 'validation.required.student'),
  itemType: z.enum(FINANCE_SALE_ITEM_TYPES),
  itemName: z.string().min(1, 'validation.required.itemName'),
  quantity: z.coerce.number().int().min(1, 'validation.quantityMin'),
  unitPriceMinor: z.coerce.number().int().min(0, 'validation.amountPositive'),
  saleDate: z.string().min(1, 'validation.required.date'),
  status: z.enum(FINANCE_SALE_STATUSES).optional(),
  notes: z.string().optional().or(z.literal('')),
});

export type FinanceSaleFormValues = z.infer<typeof financeSaleSchema>;

export const expenditureSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  title: z.string().min(1, 'validation.required.title'),
  description: z.string().optional().or(z.literal('')),
  category: z.enum(EXPENDITURE_CATEGORIES),
  amountMinor: z.coerce.number().int().min(1, 'validation.amountPositive'),
  currency: z.string().min(1),
  paymentMethod: z.enum(FINANCE_PAYMENT_METHODS),
  paymentDate: z.string().min(1, 'validation.required.date'),
  vendor: z.string().min(1, 'validation.required.vendor'),
  vendorContact: z.string().optional().or(z.literal('')),
  receiptNumber: z.string().optional().or(z.literal('')),
  invoiceNumber: z.string().optional().or(z.literal('')),
  status: z.enum(EXPENDITURE_STATUSES).optional(),
  budgetCategory: z.enum(FEE_BUDGET_CATEGORIES),
  department: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type ExpenditureFormValues = z.infer<typeof expenditureSchema>;
