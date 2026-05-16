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
import { AccountSettingsSidebarContent } from '@/app/(protected)/account/home/settings-sidebar/content';
import { PageNavbar } from '@/app/(protected)/account/page-navbar';

export default function AccountSettingsSidebarPage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      <PageNavbar />
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle />
              <ToolbarDescription>
                Tenant and account settings loaded from Supabase
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" asChild>
                <Link href="/account/home/company-profile">Institution</Link>
              </Button>
              <Button asChild>
                <Link href="/account/home/get-started">Get started</Link>
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountSettingsSidebarContent />
      </Container>
    </Fragment>
  );
}
