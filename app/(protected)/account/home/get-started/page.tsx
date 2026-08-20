'use client';

import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { AccountAccessGate } from '@/components/acadia/account/account-access-gate';
import { AccountGetStartedContent } from '@/app/(protected)/account/home/get-started/content';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canViewAccountGetStarted } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountGetStartedPage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { data: session } = useAcadiaCollegeSession();

  return (
    <AccountAccessGate allowed={canViewAccountGetStarted(session?.roleSlug)}>
      <Fragment>
        {settings?.layout === 'demo1' && (
          <Container>
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle />
                <ToolbarDescription>
                  {t('account.getStartedDescription', {
                    defaultValue: 'Shortcuts to set up students, staff, and the school year.',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
            </Toolbar>
          </Container>
        )}
        <Container>
          <AccountGetStartedContent />
        </Container>
      </Fragment>
    </AccountAccessGate>
  );
}
