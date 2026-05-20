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

export const classFormSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(160),
  levelId: z.string().min(1, 'Level is required'),
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
  branch: z.enum(ACADEMIC_BRANCHES),
  specialtyId: z.string().optional(),
  staffProfileId: z.string().optional(),
  status: z.enum(CLASS_STATUSES),
  subjectIds: z.array(z.string()),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;
