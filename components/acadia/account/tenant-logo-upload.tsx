'use client';

import { useRef } from 'react';
import { Upload } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  useTenantLogoUpload,
  type TenantLogoKind,
} from '@/hooks/use-tenant-logo-upload';
import { canManageInstitution } from '@/lib/acadia/roles';

const COPY: Record<
  TenantLogoKind,
  { button: string; helper: string; permission: string }
> = {
  institution: {
    button: 'Upload logo',
    helper: 'PNG, JPEG, WebP, or SVG — max 5 MB. Replaces the current tenant logo.',
    permission: 'Only administrators can upload the institution logo.',
  },
  reportCard: {
    button: 'Upload report card logo',
    helper:
      'PNG, JPEG, WebP, or SVG — max 5 MB. Used on report cards and class reports.',
    permission: 'Only administrators can upload the report card logo.',
  },
};

type TenantLogoUploadProps = {
  kind?: TenantLogoKind;
};

export function TenantLogoUpload({ kind = 'institution' }: TenantLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useAcadiaCollegeSession();
  const { mutate, isPending } = useTenantLogoUpload(kind);
  const canUpload = canManageInstitution(session?.roleSlug);
  const copy = COPY[kind];

  if (!canUpload) {
    return kind === 'institution' ? (
      <p className="text-sm text-muted-foreground">{copy.permission}</p>
    ) : null;
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
        {isPending ? 'Uploading…' : copy.button}
      </Button>
      <p className="text-xs text-muted-foreground">{copy.helper}</p>
    </div>
  );
}
