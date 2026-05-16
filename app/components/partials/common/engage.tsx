'use client';

import { ReactNode } from 'react';

export function Engage(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <div className={className}>{children}</div>;
}

export default Engage;
