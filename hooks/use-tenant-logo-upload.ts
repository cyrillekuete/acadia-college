'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { requireBrowserClient } from '@/lib/supabase/client';
import { TENANT_ASSETS_BUCKET } from '@/lib/supabase/storage';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

export type TenantLogoKind = 'institution' | 'reportCard';

const LOGO_UPLOAD_CONFIG = {
  institution: {
    fileStem: 'logo',
    field: 'logoStorageKey',
    successMessage: 'Institution logo updated.',
  },
  reportCard: {
    fileStem: 'report-card-logo',
    field: 'reportCardLogoStorageKey',
    successMessage: 'Report card logo updated.',
  },
} as const;

function extensionForFile(file: File): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[file.type] ?? 'png';
}

export function useTenantLogoUpload(kind: TenantLogoKind = 'institution') {
  const queryClient = useQueryClient();
  const { data: session } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const config = LOGO_UPLOAD_CONFIG[kind];

  return useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId) {
        throw new Error('Tenant context is required to upload a logo.');
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error('Use PNG, JPEG, WebP, or SVG.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Logo must be 5 MB or smaller.');
      }

      const supabase = requireBrowserClient();
      const ext = extensionForFile(file);
      const storageKey = `${tenantId}/${config.fileStem}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(TENANT_ASSETS_BUCKET)
        .upload(storageKey, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } = await supabase
        .from('Tenant')
        .update({ [config.field]: storageKey, updatedAt: new Date().toISOString() })
        .eq('id', tenantId);

      if (updateError) {
        throw updateError;
      }

      return storageKey;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acadia-tenant'] });
      toast.success(config.successMessage);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Logo upload failed.';
      toast.error(message);
    },
  });
}
