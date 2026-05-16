'use client';

import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';

export default function Page() {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Dashboard</ToolbarPageTitle>
          <ToolbarDescription>
            Welcome to Acadia College school management system.
          </ToolbarDescription>
        </ToolbarHeading>
      </Toolbar>
    </Container>
  );
}
