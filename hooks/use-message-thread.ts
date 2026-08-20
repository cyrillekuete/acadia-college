'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { unwrapRelation } from '@/lib/acadia/record-display';
import {
  MESSAGE_HISTORY_LIMIT,
  displayThreadMemberName,
} from '@/lib/acadia/messages';

export type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  Sender?: { name?: string; email?: string; status?: string };
};

export type MessageThreadMemberRow = {
  userId: string;
  name: string;
  status: string | null;
};

export type MessageThreadDetail = {
  id: string;
  kind: string;
  subjectEn: string | null;
  subjectFr: string | null;
  groupScope: string | null;
  groupScopeId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  members: MessageThreadMemberRow[];
  messages: MessageRow[];
  messagesTruncated: boolean;
};

export function useMessageThread(threadId: string | null) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  return useQuery<MessageThreadDetail | null>({
    queryKey: ['message-thread', tenantId, threadId],
    queryFn: async (): Promise<MessageThreadDetail | null> => {
      if (!tenantId || !threadId) {
        return null;
      }
      const supabase = requireBrowserClient();

      const { data: thread, error: threadError } = await supabase
        .from('MessageThread')
        .select(
          'id, kind, subjectEn, subjectFr, groupScope, groupScopeId, createdByUserId, createdAt, updatedAt',
        )
        .eq('tenantId', tenantId)
        .eq('id', threadId)
        .maybeSingle();

      if (threadError) {
        throw threadError;
      }
      if (!thread) {
        return null;
      }

      const [
        { data: members, error: memberError },
        { data: messages, error: messageError },
      ] = await Promise.all([
        supabase
          .from('MessageThreadMember')
          .select('userId, User:userId ( name, email, status )')
          .eq('tenantId', tenantId)
          .eq('threadId', threadId),
        supabase
          .from('Message')
          .select(
            'id, body, createdAt, senderUserId, Sender:senderUserId ( name, email, status )',
          )
          .eq('tenantId', tenantId)
          .eq('threadId', threadId)
          .order('createdAt', { ascending: false })
          .limit(MESSAGE_HISTORY_LIMIT),
      ]);

      if (memberError) {
        throw memberError;
      }
      if (messageError) {
        throw messageError;
      }

      const orderedMessages = [...(messages ?? [])].reverse();

      return {
        id: thread.id as string,
        kind: thread.kind as string,
        subjectEn: thread.subjectEn as string | null,
        subjectFr: thread.subjectFr as string | null,
        groupScope: thread.groupScope as string | null,
        groupScopeId: thread.groupScopeId as string | null,
        createdByUserId: (thread.createdByUserId as string | null) ?? null,
        createdAt: thread.createdAt as string,
        updatedAt: thread.updatedAt as string,
        members: (members ?? []).map((member) => {
          const user = unwrapRelation<{
            name?: string;
            email?: string;
            status?: string;
          }>(member.User);
          return {
            userId: member.userId as string,
            name: displayThreadMemberName({
              name: user?.name,
              email: user?.email,
              status: user?.status,
            }),
            status: user?.status ?? null,
          };
        }),
        messages: orderedMessages.map((message) => ({
          id: message.id as string,
          body: message.body as string,
          createdAt: message.createdAt as string,
          senderUserId: message.senderUserId as string,
          Sender:
            unwrapRelation<{ name?: string; email?: string; status?: string }>(
              message.Sender,
            ) ?? undefined,
        })),
        messagesTruncated: (messages ?? []).length >= MESSAGE_HISTORY_LIMIT,
      };
    },
    refetchInterval: 15_000,
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) && !!threadId,
  });
}
