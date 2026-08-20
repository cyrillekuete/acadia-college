'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAcadiaTenant } from '@/hooks/use-acadia-tenant';
import { useAcadiaSignOut } from '@/hooks/use-acadia-sign-out';
import {
  isAcadiaSessionReady,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
] as const;

/**
 * Best-effort idle sign-out after tenant-configured minutes (FR-1.2.2).
 * Supabase JWT expiry remains the hard session cap.
 */
export function SessionTimeoutGuard() {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const { data: tenant } = useAcadiaTenant();
  const signOut = useAcadiaSignOut();
  const lastActivityRef = useRef(Date.now());
  const warnedRef = useRef(false);

  const timeoutMinutes = tenant?.sessionTimeoutMinutes ?? 480;
  const warningMinutes = tenant?.sessionWarningMinutes ?? 5;
  const ready = isAcadiaSessionReady(isLoading, isError, session);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, touchActivity, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        touchActivity();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, touchActivity);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [ready, touchActivity]);

  useEffect(() => {
    if (!ready || timeoutMinutes <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const warningMs = Math.max(
        0,
        timeoutMs - warningMinutes * 60 * 1000,
      );

      if (idleMs >= timeoutMs) {
        void signOut();
        toast.info('You were signed out due to inactivity.');
        return;
      }

      if (idleMs >= warningMs && !warnedRef.current) {
        warnedRef.current = true;
        const minutesLeft = Math.max(
          1,
          Math.ceil((timeoutMs - idleMs) / 60_000),
        );
        toast.warning(
          `Your session will end in about ${minutesLeft} minute(s) due to inactivity.`,
        );
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [ready, timeoutMinutes, warningMinutes, signOut]);

  return null;
}
