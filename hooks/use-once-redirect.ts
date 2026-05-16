'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Client-side redirect that runs at most once per mount while on the source route.
 * Resets when the destination is reached so revisiting the source page can redirect again.
 */
export function useOnceRedirect(path: string | null) {
  const { replace } = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!path) return;

    if (pathname === path) {
      hasRedirectedRef.current = false;
      return;
    }

    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    replace(path);
    // `replace` is stable on the App Router instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replace is stable
  }, [path, pathname]);
}
