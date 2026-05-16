'use client';

import { ReactNode } from 'react';

export type Avatar = {
  filename?: string;
  variant?: string;
  fallback?: string;
  [key: string]: unknown;
};

export type Avatars = Avatar[];

export function AvatarGroup(props: {
  children?: ReactNode;
  className?: string;
  group?: Avatars;
  [key: string]: unknown;
}) {
  const { children, className } = props;
  return <div className={className}>{children}</div>;
}
