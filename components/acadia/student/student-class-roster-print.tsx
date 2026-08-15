'use client';

import type {
  StudentClassExportLabels,
  StudentClassExportRow,
} from '@/lib/acadia/student-class-export';

export type StudentClassPrintJob = {
  className: string;
  academicYearLabel: string | null;
  generatedLabel: string;
  studentCountLabel: string;
  labels: StudentClassExportLabels;
  rows: StudentClassExportRow[];
};

export function StudentClassRosterPrint({ job }: { job: StudentClassPrintJob }) {
  const columns = [
    { key: 'studentId', label: job.labels.studentId },
    { key: 'matricule', label: job.labels.matricule },
    { key: 'firstName', label: job.labels.firstName },
    { key: 'lastName', label: job.labels.lastName },
    { key: 'email', label: job.labels.email },
    { key: 'className', label: job.labels.className },
    { key: 'branch', label: job.labels.branch },
    { key: 'enrollmentStatus', label: job.labels.enrollmentStatus },
    { key: 'feesStatus', label: job.labels.feesStatus },
    { key: 'feesAmounts', label: job.labels.feesAmounts },
  ] as const;

  return (
    <div className="hidden print:block print:p-6 print:text-foreground">
      <header className="mb-4 space-y-1">
        <h1 className="text-lg font-semibold">Acadia College</h1>
        <p className="text-sm">
          {job.labels.className}: <strong>{job.className}</strong>
        </p>
        {job.academicYearLabel ? (
          <p className="text-sm">
            {job.academicYearLabel}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{job.generatedLabel}</p>
      </header>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border border-border bg-muted/40 px-2 py-1.5 text-left font-medium"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {job.rows.length === 0 ? (
            <tr>
              <td
                className="border border-border px-2 py-2 text-muted-foreground"
                colSpan={columns.length}
              >
                —
              </td>
            </tr>
          ) : (
            job.rows.map((row, index) => (
              <tr key={`${row.studentId}-${index}`}>
                {columns.map((column) => (
                  <td key={column.key} className="border border-border px-2 py-1.5">
                    {row[column.key] || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="mt-3 text-xs">{job.studentCountLabel}</p>
    </div>
  );
}
