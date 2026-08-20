export const MESSAGE_HISTORY_LIMIT = 200;
export const MESSAGE_INBOX_LIMIT = 200;

export function isSelfRecipient(
  senderUserId: string | null | undefined,
  recipientUserId: string | null | undefined,
): boolean {
  return Boolean(senderUserId && recipientUserId && senderUserId === recipientUserId);
}

export function assertNotSelfRecipient(
  senderUserId: string | null | undefined,
  recipientUserId: string | null | undefined,
): void {
  if (isSelfRecipient(senderUserId, recipientUserId)) {
    throw new Error('You cannot message yourself.');
  }
}

export function isEligibleMessageRecipient(
  user: {
    status?: string | null;
    isTrashed?: boolean | null;
    tenantId?: string | null;
  },
  ctx: { tenantId: string },
): boolean {
  return (
    user.tenantId === ctx.tenantId &&
    user.status === 'ACTIVE' &&
    user.isTrashed === false
  );
}

export function directThreadMemberPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function threadIsUnread(
  lastReadAt: string | null | undefined,
  updatedAt: string | null | undefined,
): boolean {
  if (!updatedAt) {
    return false;
  }
  if (!lastReadAt) {
    return true;
  }
  return lastReadAt < updatedAt;
}

export function displayThreadMemberName(input: {
  name?: string | null;
  email?: string | null;
  status?: string | null;
}): string {
  const label = input.name?.trim() || input.email?.trim();
  if (!label) {
    return 'Former user';
  }
  if (input.status && input.status !== 'ACTIVE') {
    return `${label} (deactivated)`;
  }
  return label;
}

export function canRemoveGroupMember(memberCount: number): boolean {
  return memberCount > 1;
}

export function matchingGroupThreads<
  T extends {
    subjectEn?: string | null;
    groupScope?: string | null;
    groupScopeId?: string | null;
  },
>(
  existing: T[],
  candidate: { subjectEn: string; groupScope: string; groupScopeId: string },
): T[] {
  const subject = candidate.subjectEn.trim().toLowerCase();
  if (!subject || !candidate.groupScopeId) {
    return [];
  }
  return existing.filter(
    (row) =>
      (row.subjectEn ?? '').trim().toLowerCase() === subject &&
      row.groupScope === candidate.groupScope &&
      row.groupScopeId === candidate.groupScopeId,
  );
}
