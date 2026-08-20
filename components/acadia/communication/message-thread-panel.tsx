'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  messageReplySchema,
  type MessageReplyFormValues,
} from '@/lib/acadia/communication-schemas';
import { formatDateTime } from '@/lib/acadia/record-display';
import {
  messageGroupScopeLabel,
  threadSubjectDisplay,
} from '@/lib/acadia/communication';
import {
  canRemoveGroupMember,
  displayThreadMemberName,
} from '@/lib/acadia/messages';
import { canManageMessageGroups } from '@/lib/acadia/roles';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useMessageThread } from '@/hooks/use-message-thread';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantUserPicker } from '@/components/acadia/communication/tenant-user-picker';
import { useTranslation } from '@/hooks/useTranslation';

export function MessageThreadPanel({ threadId }: { threadId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const currentUserId = session?.profile?.id;
  const { data, isLoading, isError, error } = useMessageThread(threadId);
  const { replyToThread, markThreadRead, updateGroupMembers } =
    useCommunicationMutations();
  const { data: users = [] } = useTenantUserOptions(currentUserId);
  const [memberToAdd, setMemberToAdd] = useState('');

  const form = useForm<MessageReplyFormValues>({
    resolver: zodResolver(messageReplySchema),
    defaultValues: { body: '' },
  });

  useEffect(() => {
    if (!data?.id) {
      return;
    }
    void markThreadRead.mutateAsync(data.id).catch(() => undefined);
    // Mark once per loaded thread id; mutation identity is stable enough for this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const isMember = Boolean(
    currentUserId && data?.members.some((member) => member.userId === currentUserId),
  );
  const canManageMembers = Boolean(
    data?.kind === 'GROUP' &&
      (canManageMessageGroups(session?.roleSlug) ||
        data.createdByUserId === currentUserId),
  );
  const activeMembers = data?.members.filter((member) => member.status !== 'INACTIVE' && member.status !== 'BLOCKED') ?? [];
  const addableUsers = useMemo(
    () =>
      users.filter(
        (user) => !data?.members.some((member) => member.userId === user.id),
      ),
    [users, data?.members],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    if (!data) {
      return;
    }
    await replyToThread.mutateAsync({
      threadId: data.id,
      values,
      subject: threadSubjectDisplay(data),
    });
    form.reset({ body: '' });
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">{getQueryErrorMessage(error)}</p>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Conversation not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {threadSubjectDisplay(data)}
            <Badge variant="secondary" appearance="light">
              {data.kind === 'GROUP' ? 'Group' : 'Direct'}
            </Badge>
            {data.groupScope ? (
              <Badge variant="outline">
                {messageGroupScopeLabel(data.groupScope)}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {t('communication.participants')}:{' '}
            {data.members.map((member) => member.name).join(', ') ||
              t('communication.noActiveMembers')}
          </p>
          {activeMembers.length === 0 ? (
            <p>{t('communication.noActiveMembers')}</p>
          ) : null}

          {data.kind === 'GROUP' && isMember ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {canRemoveGroupMember(data.members.length) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updateGroupMembers.isPending}
                  onClick={() =>
                    void updateGroupMembers
                      .mutateAsync({
                        threadId: data.id,
                        removeUserIds: currentUserId ? [currentUserId] : [],
                      })
                      .then(() => {
                        if (!canManageMessageGroups(session?.roleSlug)) {
                          router.replace('/messages');
                        }
                      })
                  }
                >
                  {t('communication.leaveGroup')}
                </Button>
              ) : (
                <p className="text-xs">{t('communication.cannotRemoveLastMember')}</p>
              )}
            </div>
          ) : null}

          {canManageMembers ? (
            <div className="space-y-2 pt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <TenantUserPicker
                    users={addableUsers}
                    value={memberToAdd}
                    onValueChange={setMemberToAdd}
                    placeholder={t('communication.selectRecipient')}
                    searchPlaceholder={t('communication.searchMembers')}
                    emptyLabel={t('communication.noUsersFound')}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!memberToAdd || updateGroupMembers.isPending}
                  onClick={() => {
                    const id = memberToAdd;
                    setMemberToAdd('');
                    void updateGroupMembers.mutateAsync({
                      threadId: data.id,
                      addUserIds: [id],
                    });
                  }}
                >
                  {t('communication.addMember')}
                </Button>
              </div>
              <ul className="space-y-1">
                {data.members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center justify-between gap-2 text-foreground"
                  >
                    <span>{member.name}</span>
                    {canRemoveGroupMember(data.members.length) &&
                    member.userId !== currentUserId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={updateGroupMembers.isPending}
                        onClick={() =>
                          void updateGroupMembers.mutateAsync({
                            threadId: data.id,
                            removeUserIds: [member.userId],
                          })
                        }
                      >
                        {t('communication.removeMember')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.messagesTruncated ? (
          <p className="text-xs text-muted-foreground">
            {t('communication.messagesTruncated')}
          </p>
        ) : null}
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('communication.noMessagesYet')}
          </p>
        ) : (
          data.messages.map((message) => (
            <Card key={message.id}>
              <CardContent className="py-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {displayThreadMemberName({
                      name: message.Sender?.name,
                      email: message.Sender?.email,
                      status: message.Sender?.status,
                    })}
                  </span>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {isMember ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="max-w-2xl space-y-3">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t('communication.writeReply')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={replyToThread.isPending}>
              {replyToThread.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {t('communication.sendReply')}
            </Button>
          </form>
        </Form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('communication.replyMembersOnly')}
        </p>
      )}
    </div>
  );
}
