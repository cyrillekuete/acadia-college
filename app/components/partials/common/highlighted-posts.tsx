'use client';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export type HighlightedPostsItems = Array<{
  icon?: LucideIcon;
  title?: string;
  summary?: string;
  path?: string;
  [key: string]: unknown;
}>;

export function HighlightedPosts(props: { posts?: HighlightedPostsItems; children?: ReactNode; className?: string }) {
  return <div className={props.className}>{props.children}</div>;
}

