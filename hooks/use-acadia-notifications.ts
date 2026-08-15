'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type AcadiaNotificationRow = {
  id: string;
  event: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string | null;
  bodyFr: string | null;
  readAt: string | null;
  createdAt: string;
  data: Record<string, unknown> | null;
};

export function useAcadiaNotifications(limit = 20) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;

  return useQuery<AcadiaNotificationRow[]>({
    queryKey: ['acadia-notifications', tenantId, userId, limit],
    queryFn: async () => {
      if (!tenantId || !userId) {
        return [];
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('Notification')
        .select('id, event, titleEn, titleFr, bodyEn, bodyFr, readAt, createdAt, data')
        .eq('tenantId', tenantId)
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(limit);
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => ({
        ...row,
        data:
          row.data && typeof row.data === 'object' && !Array.isArray(row.data)
            ? (row.data as Record<string, unknown>)
            : null,
      })) as AcadiaNotificationRow[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!userId,
  });
}
