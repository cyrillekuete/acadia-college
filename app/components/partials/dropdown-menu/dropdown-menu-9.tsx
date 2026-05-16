'use client';
import { ReactNode } from 'react';
export function DropdownMenu9(props: { children?: ReactNode; className?: string; trigger?: ReactNode; [key: string]: unknown }) {
  const { children, className, trigger } = props;
  return <>{trigger}<div className={className}>{children}</div></>;
}
export default DropdownMenu9;
