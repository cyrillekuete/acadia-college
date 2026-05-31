'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchUserRecentUploads,
  mapUserRecentUploadRow,
  type UserRecentUploadItem,
} from '@/lib/supabase/queries/user-uploads';
import { getLearningMaterialPublicUrl } from '@/lib/supabase/storage';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export function useUserRecentUploads(limit = 4) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;

  return useQuery({
    queryKey: ['user-recent-uploads', tenantId, userId, limit],
    queryFn: async (): Promise<UserRecentUploadItem[]> => {
      const supabase = requireBrowserClient();
      const rows = await fetchUserRecentUploads(
        supabase,
        tenantId!,
        userId!,
        limit,
      );
      return rows.map((row) =>
        mapUserRecentUploadRow(row, getLearningMaterialPublicUrl),
      );
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!userId,
  });
}
