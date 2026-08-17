'use client';

import { use } from 'react';
import { SystemLogDataGrid } from '@/components/acadia/admin/system-log-data-grid';

export default function StudentActivityLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <SystemLogDataGrid
      entityIdFilter={id}
      entityTypes={['StudentProfile', 'students']}
    />
  );
}
