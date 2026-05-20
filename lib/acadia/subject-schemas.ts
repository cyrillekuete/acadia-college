import { z } from 'zod';
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
} from '@/lib/acadia/education-system';
import {
  SUBJECT_TYPES,
  subjectSubBranchFormSchema,
} from '@/lib/acadia/subject-catalog';

const catalogFields = {
  subSystem: z.enum(ACADEMIC_SUB_SYSTEMS),
  branch: z.enum(ACADEMIC_BRANCHES),
  specialtyId: z.string().min(1, 'Specialty is required.'),
  levelId: z.string().min(1, 'Level is required.'),
  termId: z.string().min(1, 'Term is required.'),
};

export const subjectSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required.').max(32),
    nameEn: z.string().trim().min(1, 'English name is required.'),
    nameFr: z.string().trim().min(1, 'French name is required.'),
    credits: z.coerce.number().int().min(1, 'Credits must be at least 1.'),
    hours: z.coerce.number().int().min(1, 'Hours must be at least 1.'),
    academicYearId: z.string().min(1, 'Academic year is required.'),
    subjectType: z.enum(SUBJECT_TYPES),
    coefficient: z.coerce.number().positive('Coefficient must be greater than 0.'),
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
          message: 'Add at least one sub-branch.',
          path: ['subBranches'],
        });
      }
    } else if (data.subBranches.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Remove sub-branches or enable "Has sub-branches".',
        path: ['subBranches'],
      });
    }
  });

export type SubjectFormValues = z.infer<typeof subjectSchema>;

export const subjectAssignmentSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  staffProfileId: z.string().min(1, 'Teacher is required.'),
  isLead: z.boolean(),
  teachesPrimaryHome: z.boolean(),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type SubjectAssignmentFormValues = z.infer<typeof subjectAssignmentSchema>;

export const timetableSlotSchema = z
  .object({
    academicYearId: z.string().min(1, 'Academic year is required.'),
    subjectId: z.string().min(1, 'Subject is required.'),
    staffProfileId: z.string().min(1, 'Teacher is required.'),
    roomId: z.string().min(1, 'Room is required.'),
    dayOfWeek: z.coerce.number().int().min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format.'),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

export type TimetableSlotFormValues = z.infer<typeof timetableSlotSchema>;

export const subjectMaterialSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required.'),
  titleEn: z.string().trim().min(1, 'Title (English) is required.'),
  titleFr: z.string().trim().min(1, 'Title (French) is required.'),
  descriptionEn: z.string().optional().or(z.literal('')),
  descriptionFr: z.string().optional().or(z.literal('')),
  dueAt: z.string().min(1, 'Due date is required.'),
  maxScore: z.coerce.number().min(0, 'Max score must be 0 or greater.'),
  isPublished: z.boolean(),
});

export type SubjectMaterialFormValues = z.infer<typeof subjectMaterialSchema>;
