'use client';
import { ReactNode } from 'react';

export type ScrollspyMenuItems = Array<{
  title: string;
  target?: string;
  active?: boolean;
  children?: ScrollspyMenuItems;
}>;

export function ScrollspyMenu(props: { items?: ScrollspyMenuItems; children?: ReactNode; className?: string }) {
  return <nav className={props.className}>{props.children}</nav>;
}
