'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import {
  tenantSessionSettingsSchema,
  type TenantSessionSettingsValues,
} from '@/lib/acadia/user-schemas';
import { useUserManagementMutations } from '@/hooks/use-user-management-mutations';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canManageUsers } from '@/lib/acadia/roles';

export function TenantSessionSettingsForm() {
  const { data: session } = useAcadiaCollegeSession();
  const { data: tenant, isLoading } = useAcadiaTenant();
  const { updateSessionSettings } = useUserManagementMutations();
  const canEdit = canManageUsers(session?.roleSlug);

  const form = useForm<TenantSessionSettingsValues>({
    resolver: zodResolver(tenantSessionSettingsSchema),
    defaultValues: {
      sessionTimeoutMinutes: 480,
      sessionWarningMinutes: 5,
    },
  });

  useEffect(() => {
    if (!tenant) {
      return;
    }
    form.reset({
      sessionTimeoutMinutes: tenant.sessionTimeoutMinutes,
      sessionWarningMinutes: tenant.sessionWarningMinutes,
    });
  }, [tenant, form]);

  if (!canEdit) {
    return null;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => updateSessionSettings.mutate(values))}
        className="grid max-w-md gap-4"
      >
        <p className="text-sm text-muted-foreground">
          Administrators and registrars only. Financial directors can edit
          institution details, but not session timeout.
        </p>
        <FormField
          control={form.control}
          name="sessionTimeoutMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session timeout (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sessionWarningMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idle warning before logout (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateSessionSettings.isPending || isLoading}>
          {updateSessionSettings.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            'Save session settings'
          )}
        </Button>
      </form>
    </Form>
  );
}
