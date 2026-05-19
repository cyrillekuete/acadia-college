'use client';

import { useRef } from 'react';
import { Upload } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useTenantLogoUpload } from '@/hooks/use-tenant-logo-upload';
import { canManageInstitution } from '@/lib/acadia/roles';

export function TenantLogoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useAcadiaCollegeSession();
  const { mutate, isPending } = useTenantLogoUpload();
  const canUpload = canManageInstitution(session?.roleSlug);

  if (!canUpload) {
    return (
      <p className="text-sm text-muted-foreground">
        Only administrators can upload the institution logo.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            mutate(file);
          }
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {isPending ? 'Uploading…' : 'Upload logo'}
      </Button>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, WebP, or SVG — max 5 MB. Replaces the current tenant logo.
      </p>
    </div>
  );
}
