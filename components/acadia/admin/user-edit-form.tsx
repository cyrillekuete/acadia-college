'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useUserManagementMutations } from '@/hooks/use-user-management-mutations';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';

const STATUS_OPTIONS = [
  { value: UserStatus.ACTIVE, label: 'Active' },
  { value: UserStatus.INACTIVE, label: 'Inactive' },
  { value: UserStatus.BLOCKED, label: 'Blocked' },
];

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  roleId: string;
  country: string | null;
  timezone: string | null;
  isProtected?: boolean;
};

export function UserEditForm({ user }: { user: AdminUserRecord }) {
  const { updateUser, sendPasswordReset } = useUserManagementMutations();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoleOptions();

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
      values,
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
                <FormLabel>Full name</FormLabel>
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
                <FormLabel>Email</FormLabel>
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
                <FormLabel>Role</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={rolesLoading || user.isProtected}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
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
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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
                  <FormLabel>Country</FormLabel>
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
                  <FormLabel>Timezone</FormLabel>
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
                'Save changes'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/users">Back to users</Link>
            </Button>
          </div>
        </form>
      </Form>
      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">Password</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Send a password reset email to this user (Supabase Auth).
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={sendPasswordReset.isPending}
          onClick={() => sendPasswordReset.mutate(user.id)}
        >
          {sendPasswordReset.isPending ? 'Sending…' : 'Send password reset email'}
        </Button>
      </div>
    </div>
  );
}
