'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardNotificationProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  button?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function CardNotification({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className,
}: CardNotificationProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between flex-wrap grow gap-2 px-5 py-4 border-b border-b-border last:border-b-0',
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        {Icon ? (
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted shrink-0">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        ) : null}
        <div className="flex flex-col gap-0.5">
          {title ? (
            <span className="text-sm font-medium text-mono">{title}</span>
          ) : null}
          {description ? (
            <span className="text-sm text-secondary-foreground">
              {description}
            </span>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      {children}
    </div>
  );
}

export default CardNotification;
