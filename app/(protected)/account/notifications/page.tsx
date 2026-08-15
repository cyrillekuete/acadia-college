'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { AccountNotificationsContent } from '@/app/(protected)/account/notifications/content';
import { PageNavbar } from '@/app/(protected)/account/page-navbar';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountNotificationsPage() {
  const { settings } = useSettings();
  const { t } = useTranslation();

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                {t('account.notificationsDescription')}
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" asChild>
                <Link href="/account/home/user-profile">
                  {t('account.privacySettings')}
                </Link>
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountNotificationsContent />
      </Container>
    </Fragment>
  );
}
