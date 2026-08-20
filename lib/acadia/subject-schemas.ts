import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import {
  subjectSubBranchFormSchema,
} from '@/lib/acadia/subject-catalog';

const catalogFields = {
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
  branch: z.enum(ACADEMIC_BRANCHES),
  levelIds: z.array(z.string()).min(1, 'validation.required.levelAtLeastOne'),
};

export const subjectSchema = z
  .object({
    code: z.string().trim().min(1, 'validation.required.code').max(32),
    nameEn: z.string().trim().min(1, 'validation.required.name'),
    nameFr: z.string().trim().optional().or(z.literal('')),
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    coefficient: z.coerce.number().positive('validation.coefficientPositive'),
    groupingId: z.string().optional().or(z.literal('')),
    hasSubBranches: z.boolean(),
    subBranches: z.array(subjectSubBranchFormSchema),
    ...catalogFields,
  })
  .superRefine((data, ctx) => {
    if (data.hasSubBranches) {
      if (data.subBranches.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'validation.required.subBranch',
          path: ['subBranches'],
        });
      }
    } else if (data.subBranches.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.subBranchesMismatch',
        path: ['subBranches'],
      });
    }
    if (data.hasSubBranches) {
      const names = data.subBranches.map((branch) => branch.name.trim().toLowerCase());
      const seen = new Set<string>();
      names.forEach((name, index) => {
        if (!name) {
          return;
        }
        if (seen.has(name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'validation.duplicateSubBranchName',
            path: ['subBranches', index, 'name'],
          });
        }
        seen.add(name);
      });
    }
  });

export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const subjectAssignmentSchema = z.object({
  academicYearId: z.string().min(1, 'validation.required.academicYear'),
  staffProfileId: z.string().min(1, 'validation.required.teacher'),
  isLead: z.boolean(),
  teachesPrimaryHome: z.boolean(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type SubjectAssignmentFormValues = z.infer<typeof subjectAssignmentSchema>;

export const timetableSlotSchema = z
  .object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    classId: z.string().min(1, 'validation.required.class'),
    subjectId: z.string().min(1, 'validation.required.subject'),
    staffProfileId: z.string().min(1, 'validation.required.teacher'),
    roomId: z.string().min(1, 'validation.required.room'),
    dayOfWeek: z.coerce.number().int().min(1).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'validation.timeFormat'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'validation.timeFormat'),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'validation.endTimeAfterStart',
    path: ['endTime'],
  });

export type TimetableSlotFormValues = z.infer<typeof timetableSlotSchema>;

export const subjectMaterialSchema = z
  .object({
    academicYearId: z.string().min(1, 'validation.required.academicYear'),
    titleEn: z.string().trim().min(1, 'validation.required.titleEn'),
    titleFr: z.string().trim().min(1, 'validation.required.titleFr'),
    descriptionEn: z.string().optional().or(z.literal('')),
    descriptionFr: z.string().optional().or(z.literal('')),
    dueAt: z.string().min(1, 'validation.required.dueDate'),
    maxScore: z.coerce.number().min(0, 'validation.maxScoreMin'),
    isPublished: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.isPublished && data.maxScore < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.maxScorePublishedMin',
        path: ['maxScore'],
      });
    }
  });

export type SubjectMaterialFormValues = z.infer<typeof subjectMaterialSchema>;
