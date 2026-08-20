import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  directMessageSchema,
  directMessageSchemaForSender,
} from '@/lib/acadia/communication-schemas';
import {
  assertNotSelfRecipient,
  canRemoveGroupMember,
  directThreadMemberPair,
  displayThreadMemberName,
  isEligibleMessageRecipient,
  isSelfRecipient,
  matchingGroupThreads,
  threadIsUnread,
} from '@/lib/acadia/messages';
import { canComposeMessages, canManageMessageGroups } from '@/lib/acadia/roles';

describe('message group access', () => {
  it('lets staff and admins manage groups, not students or guardians', () => {
    expect(canManageMessageGroups('admin')).toBe(true);
    expect(canManageMessageGroups('teacher')).toBe(true);
    expect(canManageMessageGroups('bursar')).toBe(true);
    expect(canManageMessageGroups('student')).toBe(false);
    expect(canManageMessageGroups('guardian')).toBe(false);
    expect(canManageMessageGroups('parent')).toBe(false);
  });

  it('still lets every signed-in role compose direct messages', () => {
    expect(canComposeMessages('student')).toBe(true);
    expect(canComposeMessages('guardian')).toBe(true);
  });
});

describe('messages pages gate groups', () => {
  it('uses canManageMessageGroups on inbox and groups pages', () => {
    const inbox = readFileSync(
      join(process.cwd(), 'app/(protected)/messages/page.tsx'),
      'utf8',
    );
    const groups = readFileSync(
      join(process.cwd(), 'app/(protected)/messages/groups/page.tsx'),
      'utf8',
    );
    expect(inbox).toMatch(/canManageMessageGroups/);
    expect(groups).toMatch(/canManageMessageGroups/);
    expect(groups).toMatch(/router\.replace\('\/messages'\)/);
  });

  it('creates and replies through transactional RPCs', () => {
    const source = readFileSync(
      join(process.cwd(), 'hooks/use-communication-mutations.ts'),
      'utf8',
    );
    expect(source).toMatch(/acadia_create_direct_message/);
    expect(source).toMatch(/acadia_create_group_thread/);
    expect(source).toMatch(/acadia_reply_to_thread/);
    expect(source).toMatch(/acadia_mark_thread_read/);
    expect(source).toMatch(/acadia_update_group_members/);
    expect(source).not.toMatch(/from\('MessageThread'\)\.insert/);
  });
});

describe('direct message recipients', () => {
  it('rejects messaging yourself', () => {
    expect(isSelfRecipient('u1', 'u1')).toBe(true);
    expect(isSelfRecipient('u1', 'u2')).toBe(false);
    expect(() => assertNotSelfRecipient('u1', 'u1')).toThrow(
      /cannot message yourself/i,
    );
    expect(
      directMessageSchemaForSender('u1').safeParse({
        recipientUserId: 'u1',
        subjectEn: 'Hello',
        body: 'Hi',
      }).success,
    ).toBe(false);
    expect(
      directMessageSchema.parse({
        recipientUserId: 'u2',
        subjectEn: 'Hello',
        body: 'Hi',
      }).recipientUserId,
    ).toBe('u2');
  });

  it('requires an active, non-trashed user in the same tenant', () => {
    const ctx = { tenantId: 't1' };
    expect(
      isEligibleMessageRecipient(
        { status: 'ACTIVE', isTrashed: false, tenantId: 't1' },
        ctx,
      ),
    ).toBe(true);
    expect(
      isEligibleMessageRecipient(
        { status: 'INACTIVE', isTrashed: false, tenantId: 't1' },
        ctx,
      ),
    ).toBe(false);
    expect(
      isEligibleMessageRecipient(
        { status: 'ACTIVE', isTrashed: true, tenantId: 't1' },
        ctx,
      ),
    ).toBe(false);
    expect(
      isEligibleMessageRecipient(
        { status: 'ACTIVE', isTrashed: false, tenantId: 'other' },
        ctx,
      ),
    ).toBe(false);
  });
});

describe('direct thread pairing', () => {
  it('sorts member ids so A-B and B-A share a key', () => {
    expect(directThreadMemberPair('b', 'a')).toEqual(['a', 'b']);
    expect(directThreadMemberPair('a', 'b')).toEqual(
      directThreadMemberPair('b', 'a'),
    );
  });
});

describe('thread unread and member labels', () => {
  it('treats missing lastReadAt as unread when the thread has activity', () => {
    expect(threadIsUnread(null, '2026-08-20T10:00:00.000Z')).toBe(true);
    expect(
      threadIsUnread('2026-08-20T09:00:00.000Z', '2026-08-20T10:00:00.000Z'),
    ).toBe(true);
    expect(
      threadIsUnread('2026-08-20T10:00:00.000Z', '2026-08-20T10:00:00.000Z'),
    ).toBe(false);
    expect(threadIsUnread(null, null)).toBe(false);
  });

  it('labels missing and deactivated participants', () => {
    expect(displayThreadMemberName({})).toBe('Former user');
    expect(
      displayThreadMemberName({ name: 'Ada', status: 'INACTIVE' }),
    ).toBe('Ada (deactivated)');
    expect(displayThreadMemberName({ name: 'Ada', status: 'ACTIVE' })).toBe(
      'Ada',
    );
    expect(displayThreadMemberName({ email: 'ada@school.test' })).toBe(
      'ada@school.test',
    );
  });
});

describe('group membership helpers', () => {
  it('blocks removing the last member', () => {
    expect(canRemoveGroupMember(1)).toBe(false);
    expect(canRemoveGroupMember(2)).toBe(true);
  });

  it('matches existing groups by subject and scope', () => {
    const existing = [
      { subjectEn: 'Term 2 Parents', groupScope: 'LEVEL', groupScopeId: 'lvl-1' },
      { subjectEn: 'Other', groupScope: 'LEVEL', groupScopeId: 'lvl-1' },
    ];
    expect(
      matchingGroupThreads(existing, {
        subjectEn: 'term 2 parents',
        groupScope: 'LEVEL',
        groupScopeId: 'lvl-1',
      }),
    ).toHaveLength(1);
    expect(
      matchingGroupThreads(existing, {
        subjectEn: '',
        groupScope: 'LEVEL',
        groupScopeId: 'lvl-1',
      }),
    ).toHaveLength(0);
    expect(
      matchingGroupThreads(existing, {
        subjectEn: 'Term 2 Parents',
        groupScope: 'STREAM',
        groupScopeId: 'lvl-1',
      }),
    ).toHaveLength(0);
  });
});
