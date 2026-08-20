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
import { AccountAccessGate } from '@/components/acadia/account/account-access-gate';
import { AccountSettingsSidebarContent } from '@/app/(protected)/account/home/settings-sidebar/content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  canViewAccountGetStarted,
  canViewInstitutionProfile,
  canViewTenantSettings,
} from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountSettingsSidebarPage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();

  return (
    <AccountAccessGate allowed={canViewTenantSettings(session?.roleSlug)}>
      <Fragment>
        {settings?.layout === 'demo1' && (
          <Container>
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle />
                <ToolbarDescription>
                  {t('account.settingsDescription', {
                    defaultValue: 'Tenant locale, session, and academic policies.',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
              <ToolbarActions>
                {canViewInstitutionProfile(session?.roleSlug) ? (
                  <Button variant="outline" asChild>
                    <Link href="/account/home/company-profile">
                      {t('nav.institution')}
                    </Link>
                  </Button>
                ) : null}
                {canViewAccountGetStarted(session?.roleSlug) ? (
                  <Button asChild>
                    <Link href="/account/home/get-started">
                      {t('nav.getStarted')}
                    </Link>
                  </Button>
                ) : null}
              </ToolbarActions>
            </Toolbar>
          </Container>
        )}
        <Container>
          <AccountSettingsSidebarContent />
        </Container>
      </Fragment>
    </AccountAccessGate>
  );
}
