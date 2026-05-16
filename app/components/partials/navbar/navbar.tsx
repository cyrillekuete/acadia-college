'use client';

import { ReactNode } from 'react';

export function Navbar(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <nav className={className}>{children}</nav>;
}

export function NavbarActions(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  const { children, className } = props;
  return <div className={className}>{children}</div>;
}

export default Navbar;
