'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Copy, LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
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
import { toast } from 'sonner';
import { useTenantApiKeyMutations } from '@/hooks/use-tenant-api-key-mutations';
import {
  tenantApiKeyCreateSchema,
  type TenantApiKeyCreateValues,
} from '@/lib/acadia/tenant-api-keys';

export function TenantApiKeyCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createApiKey } = useTenantApiKeyMutations();
  const [plaintext, setPlaintext] = useState<string | null>(null);

  const form = useForm<TenantApiKeyCreateValues>({
    resolver: zodResolver(tenantApiKeyCreateSchema),
    defaultValues: { name: '', expiresOn: '' },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setPlaintext(null);
    form.reset({ name: '', expiresOn: '' });
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {plaintext ? 'Copy your API key' : 'Create API key'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {plaintext ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This secret is shown once. Store it in a password manager; you
                cannot view it again.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={plaintext} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy API key"
                  onClick={() => {
                    void navigator.clipboard.writeText(plaintext);
                    toast.success('API key copied.');
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                id="create-api-key-form"
                onSubmit={form.handleSubmit(async (values) => {
                  const created = await createApiKey.mutateAsync({
                    name: values.name,
                    expiresOn: values.expiresOn || undefined,
                  });
                  setPlaintext(created.plaintext);
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Reporting integration" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </DialogBody>
        <DialogFooter>
          {plaintext ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-api-key-form"
                disabled={createApiKey.isPending}
              >
                {createApiKey.isPending ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Create key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
