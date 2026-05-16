'use client';

import { ReactNode } from 'react';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';

export function AcadiaPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
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
      </Toolbar>
      {children}
    </Container>
  );
}
