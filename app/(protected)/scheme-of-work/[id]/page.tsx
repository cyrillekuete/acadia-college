'use client';

import { use } from 'react';
import { Suspense } from 'react';
import { SchemeDetailView } from '@/components/acadia/scheme-of-work/scheme-detail-view';
import { Skeleton } from '@/components/ui/skeleton';

export default function SchemeOfWorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <SchemeDetailView schemeId={id} />
    </Suspense>
  );
}
