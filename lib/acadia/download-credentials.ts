export type StaffCredentialsDownload = {
  staffCode: string;
  loginEmail: string;
  temporaryPassword: string;
  signInUrl?: string;
};

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
  const text = buildStaffCredentialsText(credentials);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `teacher-credentials-${credentials.staffCode}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
