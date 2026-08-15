export type StaffCredentialsDownload = {
  staffCode: string;
  loginEmail: string;
  temporaryPassword: string;
  signInUrl?: string;
};

export type FamilyCredentialsDownload = {
  studentId: string;
  studentLoginEmail: string;
  studentTemporaryPassword: string;
  parentCode: string;
  parentLoginEmail: string;
  parentTemporaryPassword: string | null;
  signInUrl?: string;
};

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildStaffCredentialsText(credentials: StaffCredentialsDownload): string {
  const lines = [
    'Acadia College — Teacher login credentials',
    '========================================',
    '',
    `Teacher ID:     ${credentials.staffCode}`,
    `Login email:    ${credentials.loginEmail}`,
    `Password:       ${credentials.temporaryPassword}`,
    '',
    'Sign in with your Teacher ID or login email at:',
    credentials.signInUrl ?? '/signin',
    '',
    'Keep this file secure. The password is shown only once.',
    `Generated: ${new Date().toISOString()}`,
  ];
  return lines.join('\n');
}

export function downloadStaffCredentials(credentials: StaffCredentialsDownload): void {
  downloadTextFile(
    `teacher-credentials-${credentials.staffCode}.txt`,
    buildStaffCredentialsText(credentials),
  );
}

export function buildFamilyCredentialsText(credentials: FamilyCredentialsDownload): string {
  const parentPasswordLine = credentials.parentTemporaryPassword
    ? `Password:       ${credentials.parentTemporaryPassword}`
    : 'Password:       This parent already has an account — use their existing password.';

  const lines = [
    'Acadia College — Family login credentials',
    '========================================',
    '',
    'STUDENT',
    '-------',
    `Student ID:     ${credentials.studentId}`,
    `Login email:    ${credentials.studentLoginEmail}`,
    `Password:       ${credentials.studentTemporaryPassword}`,
    '',
    'PARENT / GUARDIAN',
    '-----------------',
    `Parent code:    ${credentials.parentCode}`,
    `Login email:    ${credentials.parentLoginEmail}`,
    parentPasswordLine,
    '',
    'Sign in at:',
    credentials.signInUrl ?? '/signin',
    '',
    'Keep this file secure. Passwords are shown only once.',
    `Generated: ${new Date().toISOString()}`,
  ];
  return lines.join('\n');
}

export function downloadFamilyCredentials(credentials: FamilyCredentialsDownload): void {
  downloadTextFile(
    `family-credentials-${credentials.studentId}.txt`,
    buildFamilyCredentialsText(credentials),
  );
}
