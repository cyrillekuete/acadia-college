'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ChangePasswordSchemaType,
  getChangePasswordSchema,
} from '@/app/(auth)/forms/change-password-schema';
import { AccountEmailSchema, AccountEmailSchemaType } from '@/app/(protected)/user-management/account/forms/account-email-schema';
import { buildPasswordRecoveryRedirectUrl } from '@/lib/auth/app-origin';
import { SIGN_IN_PATH } from '@/lib/auth/routes';
import { apiFetch } from '@/lib/api';
import { requireBrowserClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from '@/lib/icons';
import { formatDateTime } from '@/lib/acadia/record-display';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

const deleteAccountSchema = (email: string) =>
  z.object({
    confirmation: z
      .string()
      .trim()
      .refine(
        (value) => value.toLowerCase() === email.toLowerCase(),
        'Enter your account email exactly to confirm deletion.',
      ),
  });

type DeleteAccountSchemaType = z.infer<ReturnType<typeof deleteAccountSchema>>;

function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<AccountEmailSchemaType>({
    resolver: zodResolver(AccountEmailSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: AccountEmailSchemaType) => {
      const response = await apiFetch('/api/acadia/account/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.trim() }),
      });
      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Unable to update email.');
      }
      const supabase = requireBrowserClient();
      await supabase.auth.refreshSession();
    },
    onSuccess: () => {
      toast.success('Email updated.');
      void queryClient.invalidateQueries({ queryKey: ['acadia-college-session'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unable to update email.';
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@school.edu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Update email
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(getChangePasswordSchema()),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: ChangePasswordSchemaType) => {
      const supabase = requireBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Password updated.');
      form.reset();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unable to update password.';
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Update password
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const router = useRouter();
  const form = useForm<DeleteAccountSchemaType>({
    resolver: zodResolver(deleteAccountSchema(email)),
    defaultValues: { confirmation: '' },
  });

  const mutation = useMutation({
    mutationFn: async (values: DeleteAccountSchemaType) => {
      const response = await apiFetch('/api/acadia/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Unable to delete account.');
      }
    },
    onSuccess: () => {
      toast.success('Your account has been deleted.');
      router.push(SIGN_IN_PATH);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
        </DialogHeader>
        <Alert variant="destructive">
          <AlertDescription>
            This permanently removes your sign-in and deactivates your Acadia
            profile. Type <strong>{email}</strong> to confirm.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={email} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Delete account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountSecurityPanel() {
  const { data: session } = useAcadiaCollegeSession();
  const authUser = session?.authUser;
  const profile = session?.profile;
  const email = authUser?.email ?? profile?.email ?? '';
  const isProtected = Boolean(profile?.isProtected);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const sendResetLink = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('No email address on this account.');
      }
      const supabase = requireBrowserClient();
      const redirectTo = buildPasswordRecoveryRedirectUrl(
        typeof window !== 'undefined' ? window.location.origin : undefined,
      );
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Password reset link sent if the address is valid.');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Unable to send reset link.';
      toast.error(message);
    },
  });

  const signOutOthers = useMutation({
    mutationFn: async () => {
      const supabase = requireBrowserClient();
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Signed out on all other devices.');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sign out other sessions.';
      toast.error(message);
    },
  });

  const signOutEverywhere = useCallback(async () => {
    const supabase = requireBrowserClient();
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = SIGN_IN_PATH;
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CardDescription>
            Your primary address for sign-in and account notifications.
          </CardDescription>
          <div className="flex items-center gap-2.5 rounded-lg bg-accent/60 p-4 text-sm">
            <span className="font-medium">{email || '—'}</span>
            <Badge variant="success" appearance="light">
              Verified
            </Badge>
          </div>
          <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
            Change email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            Update your password while signed in, or receive a reset link by
            email.
          </CardDescription>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              Change password
            </Button>
            <Button
              variant="outline"
              disabled={sendResetLink.isPending || !email}
              onClick={() => sendResetLink.mutate()}
            >
              {sendResetLink.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Email reset link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions & devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription>
            Manage where your account stays signed in.
          </CardDescription>
          <div className="rounded-lg border p-4 text-sm space-y-1">
            <div className="font-medium">This device</div>
            <div className="text-muted-foreground">
              Last sign-in: {formatDateTime(authUser?.last_sign_in_at)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              disabled={signOutOthers.isPending}
              onClick={() => signOutOthers.mutate()}
            >
              {signOutOthers.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              Sign out other devices
            </Button>
            <Button variant="outline" onClick={() => void signOutEverywhere()}>
              Sign out everywhere
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CardDescription>
            Permanently remove your sign-in and deactivate your Acadia profile.
            This action cannot be undone.
          </CardDescription>
          {isProtected ? (
            <Alert>
              <AlertDescription>
                Protected system accounts cannot be self-deleted. Contact an
                administrator.
              </AlertDescription>
            </Alert>
          ) : (
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              Delete account
            </Button>
          )}
        </CardContent>
      </Card>

      <ChangeEmailDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        email={email}
      />
    </div>
  );
}
