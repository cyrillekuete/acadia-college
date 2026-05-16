'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import { LoaderCircleIcon } from 'lucide-react';
import { createClientOrNull } from '@/lib/supabase/client';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase/env';

const RESET_SUCCESS_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

export default function Page() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const formSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClientOrNull();
      if (!supabase) {
        setError(SUPABASE_CONFIG_ERROR);
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/change-password')}`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo },
      );

      if (resetError) {
        setError(
          resetError.message.includes('rate')
            ? 'Too many requests. Please wait and try again.'
            : 'Unable to send a reset link. Please try again.',
        );
        return;
      }

      setSuccess(RESET_SUCCESS_MESSAGE);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
      >
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" onClose={() => setError(null)}>
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {success && (
          <Alert onClose={() => setSuccess(null)}>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{success}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  disabled={!!success || isProcessing}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={!!success || isProcessing}
          className="w-full"
        >
          {isProcessing ? <LoaderCircleIcon className="animate-spin" /> : null}
          Submit
        </Button>

        <Button type="button" variant="outline" className="w-full" asChild>
          <Link href="/signin">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </Button>
      </form>
    </Form>
  );
}
