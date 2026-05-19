import { UserStatus } from '@/app/models/user';
import type { SystemLogEvent } from '@/lib/acadia/system-log';

/** Maps user status transitions to audit log events. */
export function userStatusLogEvent(
  previous: string,
  next: string,
): SystemLogEvent | null {
  if (previous === next) {
    return null;
  }
  if (next === UserStatus.ACTIVE) {
    return 'user.activated';
  }
  if (next === UserStatus.INACTIVE) {
    return 'user.deactivated';
  }
  if (next === UserStatus.BLOCKED) {
    return 'user.blocked';
  }
  return 'user.updated';
}
