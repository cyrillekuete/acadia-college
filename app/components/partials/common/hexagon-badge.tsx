'use client';

import { ReactNode } from 'react';

export function HexagonBadge(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <div className={className}>{children}</div>;
}

export default HexagonBadge;
