'use client';

import { SystemLogDataGrid } from '@/components/acadia/admin/system-log-data-grid';
import { ContentLoader } from '@/components/common/content-loader';
import { useAccountUserQuery } from '../hooks/use-account-user-query';

export default function AccountLogsPage() {
  const { data: user, isLoading } = useAccountUserQuery();

  if (isLoading) {
    return <ContentLoader className="mt-8" />;
  }

  return <SystemLogDataGrid userEmailFilter={user?.email} />;
}
