import { z } from 'zod';

export const SUBJECT_TYPES = [
  'LANGUAGES',
  'RELATED_TRADE_SUBJECTS',
  'TRADE_SUBJECTS',
  'OTHERS',
] as const;

export type SubjectType = (typeof SUBJECT_TYPES)[number];

const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  LANGUAGES: 'Languages',
  RELATED_TRADE_SUBJECTS: 'Related trade subjects',
  TRADE_SUBJECTS: 'Trade subjects',
  OTHERS: 'Others',
};

export function subjectTypeLabel(type: SubjectType | string | null | undefined): string {
  if (!type) {
    return '—';
  }
  return SUBJECT_TYPE_LABELS[type as SubjectType] ?? type;
}

export const subjectSubBranchFormSchema = z.object({
  name: z.string().trim().min(1, 'Sub-branch name is required.'),
  nameFr: z.string().trim().optional().or(z.literal('')),
  coefficient: z.coerce.number().positive('Coefficient must be greater than 0.'),
});

export const subjectGroupingFormSchema = z.object({
  nameEn: z.string().trim().min(1, 'English name is required.'),
  nameFr: z.string().trim().min(1, 'French name is required.'),
  code: z.string().trim().max(32).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type SubjectGroupingFormValues = z.infer<typeof subjectGroupingFormSchema>;

export function formatSubBranchNames(
  branches: { name: string }[] | null | undefined,
  max = 3,
): string {
  if (!branches?.length) {
    return '—';
  }
  const names = branches.map((b) => b.name);
  if (names.length <= max) {
    return names.join(', ');
  }
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}
