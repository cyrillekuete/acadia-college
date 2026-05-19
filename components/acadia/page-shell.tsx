'use client';

import { ReactNode } from 'react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';

export function AcadiaPageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
          {description ? (
            <ToolbarDescription>{description}</ToolbarDescription>
          ) : null}
        </ToolbarHeading>
        {actions ? <ToolbarActions>{actions}</ToolbarActions> : null}
      </Toolbar>
      {children}
    </Container>
  );
}
