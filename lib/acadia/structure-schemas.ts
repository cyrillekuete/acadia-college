import { z } from 'zod';
import { ACADEMIC_BRANCHES, ACADEMIC_SUB_SYSTEMS } from '@/lib/acadia/education-system';

export const levelFormSchema = z.object({
  name: z.string().trim().min(1, 'Level name is required').max(120),
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
  branch: z.enum(ACADEMIC_BRANCHES),
});

export type LevelFormValues = z.infer<typeof levelFormSchema>;

export const CLASS_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const classSubjectSelectionSchema = z.object({
  subjectId: z.string(),
  subBranchIds: z.array(z.string()).nullable(),
  groupingId: z.string().nullable(),
});

export const subjectClassAssignmentSchema = z.object({
  classId: z.string(),
  subBranchIds: z.array(z.string()).nullable(),
  groupingId: z.string().nullable(),
});

export const classFormSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(160),
  levelId: z.string().min(1, 'Level is required'),
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
  branch: z.enum(ACADEMIC_BRANCHES),
  staffProfileId: z.string().optional(),
  status: z.enum(CLASS_STATUSES),
  subjectSelections: z.array(classSubjectSelectionSchema),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;
