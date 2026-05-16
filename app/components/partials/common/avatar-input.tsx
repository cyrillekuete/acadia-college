'use client';
import { ReactNode } from 'react';
export function AvatarInput(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div className={props.className}>{props.children}</div>;
}
