export class AcademicYearWriteCancelledError extends Error {
  constructor() {
    super('Save cancelled.');
    this.name = 'AcademicYearWriteCancelledError';
  }
}

export async function ensureAcademicYearWriteAllowed(
  confirmWrite: () => Promise<boolean>,
): Promise<void> {
  if (!(await confirmWrite())) {
    throw new AcademicYearWriteCancelledError();
  }
}

export function isWriteCancelledError(error: unknown): boolean {
  return error instanceof AcademicYearWriteCancelledError;
}
