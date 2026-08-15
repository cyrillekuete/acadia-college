'use client';

import Link from 'next/link';
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  DollarSign,
  FileText,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { timeAgo } from '@/lib/helpers';
import {
  notificationEventLabel,
  notificationHref,
} from '@/lib/acadia/communication';
import { getUiLocale, localizedText } from '@/lib/acadia/locale';
import type { AcadiaNotificationRow } from '@/hooks/use-acadia-notifications';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

const EVENT_ICONS = {
  'attendance.absence': ClipboardCheck,
  'announcement.broadcast': FileText,
  'announcement.event': CalendarClock,
  'message.received': MessageCircle,
  'marks.published': GraduationCap,
  'fees.overdue': DollarSign,
} as const;

export function NotificationItem({
  item,
  onOpen,
}: {
  item: AcadiaNotificationRow;
  onOpen: (item: AcadiaNotificationRow, href: string) => void;
}) {
  const { t } = useTranslation();
  const locale = getUiLocale();
  const href = notificationHref(item.event, item.data);
  const unread = !item.readAt;
  const Icon =
    EVENT_ICONS[item.event as keyof typeof EVENT_ICONS] ?? Bell;
  const title = localizedText(item.titleEn, item.titleFr);
  const body = localizedText(item.bodyEn, item.bodyFr);
  const eventLabel = t(`communication.eventLabels.${item.event}`, {
    defaultValue: notificationEventLabel(item.event, locale),
  });

  return (
    <div className="flex grow gap-2.5 px-5">
      <Avatar>
        <AvatarFallback className="bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col gap-1 grow min-w-0">
        <div className="text-sm font-medium mb-px">
          <Link
            href={href}
            onClick={(event) => {
              event.preventDefault();
              onOpen(item, href);
            }}
            className={cn(
              'hover:text-primary text-mono',
              unread ? 'font-semibold' : 'font-medium',
            )}
          >
            {title}
          </Link>
        </div>
        {body ? (
          <p className="text-sm text-secondary-foreground line-clamp-2">
            {body}
          </p>
        ) : null}
        <span className="flex items-center text-xs font-medium text-muted-foreground">
          {timeAgo(item.createdAt)}
          <span className="rounded-full size-1 bg-mono/30 mx-1.5" />
          {eventLabel}
          {unread ? (
            <>
              <span className="rounded-full size-1 bg-mono/30 mx-1.5" />
              {t('communication.unread')}
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}
