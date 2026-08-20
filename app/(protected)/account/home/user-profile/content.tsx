'use client';

import { RecentUploads } from './components/recent-uploads';
import { AccountDataState } from '@/components/acadia/account/account-data-state';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { Badge } from '@/components/ui/badge';
import { AccountProvider } from '@/app/(protected)/user-management/account/components/account-context';
import AccountProfile from '@/app/(protected)/user-management/account/components/account-profile';
import { useAccountUserQuery } from '@/app/(protected)/user-management/account/hooks/use-account-user-query';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { canManageResources, isAdmin, isStaffOrTeacher } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

function AccountUserProfileGrid() {
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const { data: user, isLoading, isError, error } = useAccountUserQuery();
  const roleSlug = session?.roleSlug;
  const showUploads =
    isAdmin(roleSlug) || isStaffOrTeacher(roleSlug) || canManageResources(roleSlug);

  return (
    <AccountDataState
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={!user}
      emptyMessage={t('account.noLinkedProfile', {
        defaultValue: 'No Acadia user profile linked to this account.',
      })}
    >
      {user ? (
        <AccountProvider user={user}>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 lg:gap-7.5">
            <AccountProfile />
            <div className="flex flex-col gap-5 lg:gap-7.5">
              <RecordDetailCard
                title={t('account.signIn', { defaultValue: 'Sign-in' })}
                fields={[
                  {
                    label: t('common.labels.email'),
                    value: formatRecordValue(user.email),
                  },
                  {
                    label: t('account.role', { defaultValue: 'Role' }),
                    value: user.role?.name ? (
                      <Badge variant="primary" appearance="light">
                        {user.role.name}
                      </Badge>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: t('common.labels.status'),
                    value: formatRecordValue(user.status),
                  },
                  {
                    label: t('account.security'),
                    value: (
                      <Link
                        href="/user-management/account/security"
                        className="text-primary hover:underline"
                      >
                        {t('account.managePasswordEmail', {
                          defaultValue: 'Password, email, and sessions',
                        })}
                      </Link>
                    ),
                  },
                ]}
              />
              {showUploads ? <RecentUploads title={t('account.myFiles', { defaultValue: 'My files' })} /> : null}
            </div>
          </div>
        </AccountProvider>
      ) : null}
    </AccountDataState>
  );
}

export function AccountUserProfileContent() {
  return <AccountUserProfileGrid />;
}
