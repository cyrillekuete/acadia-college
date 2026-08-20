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
import { AccountUserProfileContent } from '@/app/(protected)/account/home/user-profile/content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canViewTenantSettings } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountUserProfilePage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                {t('account.profileDescription', {
                  defaultValue: 'Your name, photo, and sign-in details.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" asChild>
                <Link href="/account/notifications">{t('nav.notifications')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/user-management/account/security">{t('nav.security')}</Link>
              </Button>
              {canViewTenantSettings(session?.roleSlug) ? (
                <Button asChild>
                  <Link href="/account/home/settings-sidebar">{t('nav.settings')}</Link>
                </Button>
              ) : null}
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountUserProfileContent />
      </Container>
    </Fragment>
  );
}
