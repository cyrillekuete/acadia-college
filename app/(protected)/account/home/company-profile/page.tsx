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
import { AccountCompanyProfileContent } from '@/app/(protected)/account/home/company-profile/content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canViewInstitutionProfile, canViewTenantSettings } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountCompanyProfilePage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();
  const canOpenSettings = canViewTenantSettings(session?.roleSlug);

  return (
    <AccountAccessGate allowed={canViewInstitutionProfile(session?.roleSlug)}>
      <Fragment>
        {settings?.layout === 'demo1' && (
          <Container>
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle />
                <ToolbarDescription>
                  {t('account.institutionDescription', {
                    defaultValue: 'School identity, contact, and branding.',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
              {canOpenSettings ? (
                <ToolbarActions>
                  <Button variant="outline" asChild>
                    <Link href="/account/home/settings-sidebar">
                      {t('nav.settings')}
                    </Link>
                  </Button>
                </ToolbarActions>
              ) : null}
            </Toolbar>
          </Container>
        )}
        <Container>
          <AccountCompanyProfileContent />
        </Container>
      </Fragment>
    </AccountAccessGate>
  );
}
