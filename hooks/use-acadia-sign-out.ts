'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClientOrNull } from '@/lib/supabase/client';
import { SIGN_IN_PATH } from '@/lib/auth/routes';

export function useAcadiaSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const supabase = createClientOrNull();
    if (supabase) {
      await supabase.auth.signOut();
    }
    queryClient.removeQueries({ queryKey: ['acadia-college-session'] });
    router.push(SIGN_IN_PATH);
    router.refresh();
  }, [queryClient, router]);
}
