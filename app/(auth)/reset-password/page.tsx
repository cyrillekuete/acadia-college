'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Check } from '@/lib/icons';
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
import { LoaderCircleIcon } from '@/lib/icons';
import { createClientOrNull } from '@/lib/supabase/client';
import { SUPABASE_CONFIG_ERROR } from '@/lib/supabase/env';
import { useTranslation } from '@/hooks/useTranslation';

export default function Page() {
  const { t } = useTranslation();
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
            ? t('auth.resetRateLimit')
            : t('auth.resetFailed'),
        );
        return;
      }

      setSuccess(t('auth.resetSuccess'));
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.unexpectedError'),
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
            {t('auth.resetTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.resetSubtitle')}
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
              <FormLabel>{t('common.labels.email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('auth.resetEmailPlaceholder')}
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
          {t('common.buttons.submit')}
        </Button>

        <Button type="button" variant="outline" className="w-full" asChild>
          <Link href="/signin">
            <ArrowLeft className="size-3.5" /> {t('common.buttons.back')}
          </Link>
        </Button>
      </form>
    </Form>
  );
}
