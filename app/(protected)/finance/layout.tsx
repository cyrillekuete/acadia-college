'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteFinance, isGuardian, isStudent } from '@/lib/acadia/roles';
import { Skeleton } from '@/components/ui/skeleton';

function isSelfServiceFinancePath(pathname: string): boolean {
  if (pathname === '/finance/my-fees') {
    return true;
  }
  return (
    /^\/finance\/fees\/[^/]+$/.test(pathname) ||
    /^\/finance\/fees\/[^/]+\/invoice$/.test(pathname)
  );
}

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } = useAcadiaCollegeSession();
  const canManage = canWriteFinance(session?.roleSlug);
  const selfService = isStudent(session?.roleSlug) || isGuardian(session?.roleSlug);

  useEffect(() => {
    if (isLoading || !session?.roleSlug) {
      return;
    }
    if (canManage) {
      return;
    }
    if (selfService && pathname === '/finance/fees') {
      router.replace('/finance/my-fees');
      return;
    }
    if (selfService && isSelfServiceFinancePath(pathname)) {
      return;
    }
    if (!canManage) {
      router.replace(selfService ? '/finance/my-fees' : '/');
    }
  }, [canManage, isLoading, pathname, router, selfService, session?.roleSlug]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (canManage) {
    return children;
  }

  if (selfService && (pathname === '/finance/my-fees' || isSelfServiceFinancePath(pathname))) {
    return children;
  }

  return <Skeleton className="h-48 w-full" />;
}
