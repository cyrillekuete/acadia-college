'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export default function UserActivityLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['user-user', id],
    queryFn: async () => {
      const response = await apiFetch(`/api/user-management/users/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load user');
      }
      return response.json() as { email?: string };
    },
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    const email = user?.email;
    if (email) {
      router.replace(`/admin/logs?userEmail=${encodeURIComponent(email)}`);
    } else if (user !== undefined) {
      router.replace('/admin/logs');
    }
  }, [user, router]);

  return null;
}
