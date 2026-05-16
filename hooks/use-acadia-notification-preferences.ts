'use client';

import { useQuery } from '@tanstack/react-query';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export type NotificationPreferenceRow = {
  id: string;
  event: string;
  inApp: boolean;
  email: boolean;
  updatedAt: string;
};

export function useAcadiaNotificationPreferences() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;

  return useQuery<NotificationPreferenceRow[]>({
    queryKey: ['acadia-notification-preferences', tenantId, userId],
    queryFn: async () => {
      if (!tenantId || !userId) {
        return [];
      }
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('NotificationPreference')
        .select('id, event, inApp, email, updatedAt')
        .eq('tenantId', tenantId)
        .eq('userId', userId)
        .order('event');
      if (error) {
        throw error;
      }
      return (data ?? []) as NotificationPreferenceRow[];
    },
    enabled:
      isAcadiaTenantQueryEnabled(isLoading, isError, session, tenantId) &&
      !!userId,
  });
}
