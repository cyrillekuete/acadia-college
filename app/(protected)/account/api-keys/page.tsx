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
import { AccountApiKeysContent } from '@/app/(protected)/account/api-keys/content';
import { useTranslation } from '@/hooks/useTranslation';

export default function AccountApiKeysPage() {
  const { settings } = useSettings();
  const { t } = useTranslation();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                {t('account.apiKeysDescription', {
                  defaultValue: 'Manage tenant API keys for trusted integrations.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountApiKeysContent />
      </Container>
    </Fragment>
  );
}
