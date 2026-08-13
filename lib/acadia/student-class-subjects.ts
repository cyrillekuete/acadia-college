export type StudentClassSubjectSubBranch = {
  id: string;
  name: string;
  nameFr: string | null;
  sortOrder?: number;
};

export type StudentClassSubjectRow = {
  id: string;
  code: string;
  nameEn: string;
  nameFr: string;
  coefficient: number;
  groupingName: string | null;
  subBranches: StudentClassSubjectSubBranch[];
};

export type ClassSubjectDisplayInput = {
  subject: {
    id: string;
    code: string;
    nameEn: string;
    nameFr: string;
    coefficient: number;
    deactivatedAt: string | null;
    groupingName: string | null;
    subBranches: StudentClassSubjectSubBranch[];
  } | null;
  classGroupingName: string | null;
  assignedSubBranchIds: string[] | null;
};

export function toStudentClassSubjectRow(
  input: ClassSubjectDisplayInput,
): StudentClassSubjectRow | null {
  const subject = input.subject;
  if (!subject || subject.deactivatedAt) {
    return null;
  }

  const groupingName =
    input.classGroupingName?.trim() || subject.groupingName?.trim() || null;

  const assignedIds = input.assignedSubBranchIds;
  const subBranches =
    assignedIds && assignedIds.length > 0
      ? subject.subBranches.filter((branch) => assignedIds.includes(branch.id))
      : subject.subBranches;

  return {
    id: subject.id,
    code: subject.code,
    nameEn: subject.nameEn,
    nameFr: subject.nameFr,
    coefficient: subject.coefficient,
    groupingName,
    subBranches,
  };
}
