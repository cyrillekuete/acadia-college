'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from 'lucide-react';
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
import { messageGroupScopeLabel, threadSubjectDisplay } from '@/lib/acadia/communication';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useMessageThread } from '@/hooks/use-message-thread';
import { getQueryErrorMessage } from '@/lib/acadia/query-errors';
import { Skeleton } from '@/components/ui/skeleton';

export function MessageThreadPanel({ threadId }: { threadId: string }) {
  const { data, isLoading, isError, error } = useMessageThread(threadId);
  const { replyToThread } = useCommunicationMutations();

  const form = useForm<MessageReplyFormValues>({
    resolver: zodResolver(messageReplySchema),
    defaultValues: { body: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!data) {
      return;
    }
    await replyToThread.mutateAsync({
      threadId: data.id,
      values,
      memberUserIds: data.members.map((m) => m.userId),
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
        <CardContent className="text-sm text-muted-foreground">
          Participants: {data.members.map((m) => m.name).join(', ')}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
                <span className="font-medium text-foreground">
                  {message.Sender?.name ?? message.Sender?.email ?? 'User'}
                </span>
                <span>{formatDateTime(message.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-3 max-w-2xl">
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea rows={4} placeholder="Write a reply…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={replyToThread.isPending}>
            {replyToThread.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Send reply
          </Button>
        </form>
      </Form>
    </div>
  );
}
