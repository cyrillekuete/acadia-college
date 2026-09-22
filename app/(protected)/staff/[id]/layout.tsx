'use client';

import { use, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStaffDetailQuery } from '@/hooks/use-staff-detail-query';

export default function StaffDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const redirected = useRef(false);
  const { data, isFetched, isError, error, isLoading, isFetching } =
    useStaffDetailQuery(id);

  useEffect(() => {
    if (!data?.id || data.id === id) {
      return;
    }
    const marker = `/staff/${id}`;
    const index = pathname.indexOf(marker);
    if (index === -1) {
      return;
    }
    const next =
      pathname.slice(0, index) +
      `/staff/${data.id}` +
      pathname.slice(index + marker.length);
    router.replace(next);
  }, [data?.id, id, pathname, router]);

  useEffect(() => {
    if (redirected.current || isLoading || isFetching || !isFetched || data) {
      return;
    }
    redirected.current = true;
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Staff not found.';
    toast.error(message);
    router.replace('/staff');
  }, [data, error, isError, isFetched, isFetching, isLoading, router]);

  if (!isLoading && !isFetching && isFetched && (isError || !data)) {
    return null;
  }

  return children;
}
