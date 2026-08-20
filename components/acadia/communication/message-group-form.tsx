'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircleIcon } from '@/lib/icons';
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
import {
  ACADEMIC_BRANCHES,
  ACADEMIC_SUB_SYSTEMS,
  levelDisplayLabel,
} from '@/lib/acadia/education-system';
import { useCommunicationMutations } from '@/hooks/use-communication-mutations';
import { useTenantUserOptions } from '@/hooks/use-tenant-user-options';
import { useAcadiaCollegeSession, isAcadiaTenantQueryEnabled } from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { localizedText } from '@/lib/acadia/locale';
import { matchingGroupThreads } from '@/lib/acadia/messages';
import { useTranslation } from '@/hooks/useTranslation';

export function MessageGroupForm({ onCancelHref }: { onCancelHref: string }) {
  const { t } = useTranslation();
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: users = [] } = useTenantUserOptions(session?.profile?.id);
  const { createGroupThread } = useCommunicationMutations();

  const form = useForm<GroupThreadFormValues>({
    resolver: zodResolver(groupThreadSchema),
    defaultValues: {
      subjectEn: '',
      subjectFr: '',
      groupScope: 'STREAM',
      groupScopeId: '',
      memberUserIds: [],
      body: '',
    },
  });

  const groupScope = form.watch('groupScope');
  const groupScopeId = form.watch('groupScopeId');
  const subjectEn = form.watch('subjectEn');
  const [memberSearch, setMemberSearch] = useState('');

  const scopeOptionsQuery = useQuery({
    queryKey: ['message-group-scope-options', tenantId, groupScope, t],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      if (groupScope === 'DEPARTMENT') {
        const { data, error } = await supabase
          .from('Department')
          .select('id, code, nameEn, nameFr')
          .eq('tenantId', tenantId!)
          .order('nameEn');
        if (error) {
          throw error;
        }
        return (data ?? []).map((row) => ({
          id: row.id as string,
          label: `${row.code} — ${localizedText(row.nameEn as string, row.nameFr as string)}`,
        }));
      }
      if (groupScope === 'STREAM') {
        return ACADEMIC_SUB_SYSTEMS.flatMap((subSystem) =>
          ACADEMIC_BRANCHES.map((branch) => ({
            id: `${subSystem}:${branch}`,
            label: `${t(`catalog.subSystem.${subSystem}`)} · ${t(`catalog.branch.${branch}`)}`,
          })),
        );
      }
      const { data, error } = await supabase
        .from('Level')
        .select('id, number, labelEn, labelFr, subSystem, branch')
        .eq('tenantId', tenantId!)
        .order('number');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: row.id as string,
        label: `${t(`catalog.subSystem.${row.subSystem}`)} · ${t(`catalog.branch.${row.branch}`)} — ${levelDisplayLabel(row)}`,
      }));
    },
    enabled: isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId),
  });

  const existingGroupsQuery = useQuery({
    queryKey: ['message-group-existing', tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('MessageThread')
        .select('id, subjectEn, groupScope, groupScopeId')
        .eq('tenantId', tenantId!)
        .eq('kind', 'GROUP');
      if (error) {
        throw error;
      }
      return data ?? [];
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

  const duplicateGroups = useMemo(
    () =>
      matchingGroupThreads(existingGroupsQuery.data ?? [], {
        subjectEn,
        groupScope,
        groupScopeId,
      }),
    [existingGroupsQuery.data, subjectEn, groupScope, groupScopeId],
  );

  const visibleUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((user) =>
      `${user.name} ${user.roleSlug ?? ''} ${user.email ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [users, memberSearch]);

  const memberHint = useMemo(() => {
    if (selectedMembers.length === 0) {
      return t('communication.selectMembers');
    }
    return t('communication.membersSelected', { count: selectedMembers.length });
  }, [selectedMembers.length, t]);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="subjectEn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('communication.groupSubjectEn')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {duplicateGroups.length > 0 ? (
                <p className="text-xs text-amber-600">
                  {t('communication.duplicateGroupWarning')}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupScope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('communication.groupScope')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MESSAGE_GROUP_SCOPES.map((scope) => (
                    <SelectItem key={scope} value={scope}>
                      {t(`communication.scope.${scope}`, {
                        defaultValue: messageGroupScopeLabel(scope),
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                {t('communication.groupScopeHint')}
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupScopeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('communication.scopeTarget')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('communication.selectTarget')} />
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
          <FormLabel>{t('communication.members')}</FormLabel>
          <p className="text-xs text-muted-foreground mb-2">{memberHint}</p>
          <Input
            className="mb-2"
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder={t('communication.searchMembers')}
          />
          <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
            {visibleUsers.map((user) => (
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
              <FormLabel>{t('communication.openingMessage')}</FormLabel>
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
            {t('communication.createGroup')}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={onCancelHref}>{t('common.buttons.cancel')}</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
