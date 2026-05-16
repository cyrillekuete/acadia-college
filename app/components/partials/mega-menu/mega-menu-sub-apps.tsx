'use client';
import { ReactNode } from 'react';
export function MegaMenuSubApps(props: { children?: ReactNode; className?: string; trigger?: ReactNode; [key: string]: unknown }) {
  const { children, className, trigger } = props;
  return <>{trigger}<div className={className}>{children}</div></>;
}
export default MegaMenuSubApps;
