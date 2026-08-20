'use client';

import { SystemLogDataGrid } from '@/components/acadia/admin/system-log-data-grid';
import { ContentLoader } from '@/components/common/content-loader';
import { useAccountUserQuery } from '../hooks/use-account-user-query';

export default function AccountLogsPage() {
  const { data: user, isLoading, isError } = useAccountUserQuery();

  if (isLoading) {
    return <ContentLoader className="mt-8" />;
  }

  if (isError || !user?.id) {
    return (
      <p className="text-sm text-destructive py-8">
        Could not load your activity log.
      </p>
    );
  }

  return <SystemLogDataGrid subjectUserId={user.id} />;
}
