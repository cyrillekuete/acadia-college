'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenLoader } from '@/components/common/screen-loader';
import { Demo1Layout } from '../components/layouts/demo1/layout';
import {
  isAcadiaSessionReady,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isLoading, isError } = useAcadiaCollegeSession();
  const { replace } = useRouter();
  const isAuthenticated = isAcadiaSessionReady(isLoading, isError, session);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      replace('/signin');
    }
  }, [isLoading, isAuthenticated, replace]);

  if (isLoading || !isAuthenticated) {
    return <ScreenLoader />;
  }

  return <Demo1Layout>{children}</Demo1Layout>;
}
