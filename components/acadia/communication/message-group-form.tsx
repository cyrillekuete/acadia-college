'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  groupThreadSchema,
  type GroupThreadFormValues,
} from '@/lib/acadia/communication-schemas';
import { MESSAGE_GROUP_SCOPES, messageGroupScopeLabel } from '@/lib/acadia/communication';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
} from '@/hooks/use-acadia-college-session';

export function MessageGroupForm({ onCancelHref }: { onCancelHref: string }) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: users = [] } = useTenantUserOptions(session?.profile?.id);
  const { createGroupThread } = useCommunicationMutations();

  const form = useForm<GroupThreadFormValues>({
    resolver: zodResolver(groupThreadSchema),
    defaultValues: {
      subjectEn: '',
      subjectFr: '',
      groupScope: 'SPECIALTY',
      groupScopeId: '',
      memberUserIds: [],
      body: '',
    },
  });

  const groupScope = form.watch('groupScope');

  const scopeOptionsQuery = useQuery({
    queryKey: ['message-group-scope-options', tenantId, groupScope],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      if (groupScope === 'DEPARTMENT') {
        const { data, error } = await supabase
          .from('Department')
          .select('id, code, nameEn')
          .eq('tenantId', tenantId!)
          .order('nameEn');
        if (error) {
          throw error;
        }
        return (data ?? []).map((row) => ({
          id: row.id as string,
          label: `${row.code} — ${row.nameEn}`,
        }));
      }
      if (groupScope === 'SPECIALTY') {
        const { data, error } = await supabase
          .from('Specialty')
          .select('id, code, nameEn')
          .eq('tenantId', tenantId!)
          .order('nameEn');
        if (error) {
          throw error;
        }
        return (data ?? []).map((row) => ({
          id: row.id as string,
          label: `${row.code} — ${row.nameEn}`,
        }));
      }
      const { data, error } = await supabase
        .from('Level')
        .select('id, number, labelEn, Specialty:specialtyId ( code )')
        .eq('tenantId', tenantId!)
        .order('number');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => {
        const specialty = row.Specialty as { code?: string } | null;
        return {
          id: row.id as string,
          label: `${specialty?.code ?? '—'} — Level ${row.number}`,
        };
      });
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  useEffect(() => {
    form.setValue('groupScopeId', '');
  }, [groupScope, form]);

  const selectedMembers = form.watch('memberUserIds');

  const toggleMember = (userId: string, checked: boolean) => {
    const current = form.getValues('memberUserIds');
    if (checked) {
      form.setValue('memberUserIds', Array.from(new Set([...current, userId])));
      return;
    }
    form.setValue(
      'memberUserIds',
      current.filter((id) => id !== userId),
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await createGroupThread.mutateAsync(values);
  });

  const scopeOptions = scopeOptionsQuery.data ?? [];

  const memberHint = useMemo(() => {
    if (selectedMembers.length === 0) {
      return 'Select at least one participant besides yourself.';
    }
    return `${selectedMembers.length} member(s) selected`;
  }, [selectedMembers.length]);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="subjectEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group subject (English)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupScope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group scope</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MESSAGE_GROUP_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {messageGroupScopeLabel(scope)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupScopeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope target</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {scopeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Members</FormLabel>
          <p className="text-xs text-muted-foreground mb-2">{memberHint}</p>
          <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedMembers.includes(user.id)}
                  onCheckedChange={(checked) =>
                    toggleMember(user.id, checked === true)
                  }
                />
                <span>
                  {user.name}
                  {user.roleSlug ? ` (${user.roleSlug})` : ''}
                </span>
              </label>
            ))}
          </div>
          <FormMessage>{form.formState.errors.memberUserIds?.message}</FormMessage>
        </FormItem>

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opening message</FormLabel>
              <FormControl>
                <Textarea rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={createGroupThread.isPending}>
            {createGroupThread.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Create group
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
