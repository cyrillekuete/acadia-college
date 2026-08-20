'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserStatus } from '@/app/models/user';
import {
  editUserSchema,
  type EditUserFormValues,
} from '@/lib/acadia/user-schemas';
import { canSendAdminPasswordReset, isAdminDirectoryRole, registryPathForRole } from '@/lib/acadia/user-management';
import { useUserManagementMutations } from '@/hooks/use-user-management-mutations';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';
import { useTranslation } from '@/hooks/useTranslation';

const STATUS_OPTIONS = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.BLOCKED,
] as const;

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  roleId: string;
  country: string | null;
  timezone: string | null;
  isProtected?: boolean;
  isTrashed?: boolean;
  updatedAt?: string | null;
  roleSlug?: string | null;
};

export function UserEditForm({ user }: { user: AdminUserRecord }) {
  const { t } = useTranslation();
  const { updateUser, sendPasswordReset } = useUserManagementMutations();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoleOptions({
    directoryOnly: true,
  });
  const directoryAccount = isAdminDirectoryRole(user.roleSlug);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: user.email,
      name: user.name ?? '',
      roleId: user.roleId,
      status: user.status as EditUserFormValues['status'],
      country: user.country ?? '',
      timezone: user.timezone ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      email: user.email,
      name: user.name ?? '',
      roleId: user.roleId,
      status: user.status as EditUserFormValues['status'],
      country: user.country ?? '',
      timezone: user.timezone ?? '',
    });
  }, [user, form]);

  const onSubmit = (values: EditUserFormValues) => {
    updateUser.mutate({
      id: user.id,
      values: {
        ...values,
        expectedUpdatedAt: user.updatedAt ?? undefined,
        isTrashed:
          values.status === UserStatus.ACTIVE ? false : user.isTrashed,
      },
      previousStatus: user.status,
      previousRoleId: user.roleId,
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.fullName')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.labels.email')}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.role')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={rolesLoading || user.isProtected || !directoryAccount}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.selectRole')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!directoryAccount ? (
                  <p className="text-xs text-muted-foreground">
                    This role is managed from{' '}
                    <Link
                      href={registryPathForRole(user.roleSlug)}
                      className="underline underline-offset-2"
                    >
                      {registryPathForRole(user.roleSlug) === '/students'
                        ? 'Students'
                        : 'Staff'}
                    </Link>
                    .
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.labels.status')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={user.isProtected}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`admin.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.country')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.timezone')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={updateUser.isPending || user.isProtected}>
              {updateUser.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                t('admin.saveChanges')
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/users">{t('admin.backToUsers')}</Link>
            </Button>
          </div>
        </form>
      </Form>
      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">{t('common.labels.password')}</p>
        <p className="mb-3 text-sm text-muted-foreground">
          {t('admin.passwordResetHint')}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={
            sendPasswordReset.isPending ||
            !canSendAdminPasswordReset({
              status: user.status,
              isTrashed: Boolean(user.isTrashed),
            })
          }
          onClick={() => sendPasswordReset.mutate(user.id)}
        >
          {sendPasswordReset.isPending
            ? t('admin.sending')
            : t('admin.sendPasswordResetEmail')}
        </Button>
      </div>
    </div>
  );
}
