'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALERT_INBOX_PAGE_SIZE,
  isAlertVisibleToGuardian,
} from '@/lib/acadia/alerts';
import { alertChannelLabel } from '@/lib/acadia/alerts';
import { getUiLocale, localizedText } from '@/lib/acadia/locale';
import { useAlertMutations } from '@/hooks/use-alert-mutations';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

type InboxRow = {
  id: string;
  alertId: string;
  readAt: string | null;
  createdAt: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string | null;
  bodyFr: string | null;
  priority: string;
  channel: string;
  status: string;
};

function priorityBadgeVariant(priority: string) {
  if (priority === 'urgent') return 'destructive' as const;
  if (priority === 'high') return 'warning' as const;
  if (priority === 'normal') return 'secondary' as const;
  return 'outline' as const;
}

function typeIcon(channel: string) {
  if (channel === 'whatsapp') return MessageCircle;
  if (channel === 'sms') return Phone;
  if (channel === 'email') return Mail;
  if (channel === 'both') return MessageSquare;
  return Bell;
}

export function GuardianAnnouncementsInbox() {
  const { t } = useTranslation();
  const locale = getUiLocale();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const userId = session?.profile?.id ?? null;
  const { markAlertRead } = useAlertMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inboxLimit, setInboxLimit] = useState(ALERT_INBOX_PAGE_SIZE);

  const query = useQuery({
    queryKey: ['school-alerts', 'inbox', tenantId, userId, inboxLimit],
    queryFn: async (): Promise<InboxRow[]> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SchoolAlertRecipient')
        .select(
          'id, alertId, readAt, createdAt, SchoolAlert!inner ( id, titleEn, titleFr, bodyEn, bodyFr, priority, channel, status )',
        )
        .eq('tenantId', tenantId!)
        .eq('guardianUserId', userId!)
        .eq('SchoolAlert.status', 'SENT')
        .order('createdAt', { ascending: false })
        .limit(inboxLimit);
      if (error) {
        throw error;
      }
      return (data ?? []).flatMap((row) => {
        const nested = row.SchoolAlert as
          | {
              titleEn?: string;
              titleFr?: string;
              bodyEn?: string | null;
              bodyFr?: string | null;
              priority?: string;
              channel?: string;
              status?: string;
            }
          | {
              titleEn?: string;
              titleFr?: string;
              bodyEn?: string | null;
              bodyFr?: string | null;
              priority?: string;
              channel?: string;
              status?: string;
            }[]
          | null;
        const alert = Array.isArray(nested) ? nested[0] : nested;
        if (!alert || !isAlertVisibleToGuardian(alert.status ?? '')) {
          return [];
        }
        return [
          {
            id: row.id as string,
            alertId: row.alertId as string,
            readAt: (row.readAt as string | null) ?? null,
            createdAt: row.createdAt as string,
            titleEn: alert.titleEn as string,
            titleFr: alert.titleFr as string,
            bodyEn: (alert.bodyEn as string | null) ?? null,
            bodyFr: (alert.bodyFr as string | null) ?? null,
            priority: alert.priority as string,
            channel: alert.channel as string,
            status: alert.status as string,
          },
        ];
      });
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId) &&
      Boolean(userId),
  });

  const filtered = useMemo(() => {
    const rows = query.data ?? [];
    return rows.filter((row) => {
      const title = localizedText(row.titleEn, row.titleFr, locale);
      const body = localizedText(row.bodyEn, row.bodyFr, locale);
      const matchesSearch =
        !searchQuery ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        body.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority =
        priorityFilter === 'all' || row.priority === priorityFilter;
      const matchesType =
        typeFilter === 'all' ||
        row.channel === typeFilter ||
        (typeFilter === 'sms' && row.channel === 'both') ||
        (typeFilter === 'email' && row.channel === 'both');
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'read' && Boolean(row.readAt)) ||
        (statusFilter === 'unread' && !row.readAt);
      return matchesSearch && matchesPriority && matchesType && matchesStatus;
    });
  }, [locale, priorityFilter, query.data, searchQuery, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('communication.inboxTitle')}</h1>
          <p className="text-muted-foreground">{t('communication.inboxDescription')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('communication.searchAnnouncements')}
                className="pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('communication.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('communication.allPriorities')}</SelectItem>
                <SelectItem value="urgent">{t('communication.priorityLabels.urgent')}</SelectItem>
                <SelectItem value="high">{t('communication.priorityLabels.high')}</SelectItem>
                <SelectItem value="normal">{t('communication.priorityLabels.normal')}</SelectItem>
                <SelectItem value="low">{t('communication.priorityLabels.low')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('communication.typeLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('communication.allTypes')}</SelectItem>
                <SelectItem value="whatsapp">{t('communication.whatsapp')}</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('communication.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('communication.allStatus')}</SelectItem>
                <SelectItem value="unread">{t('communication.unread')}</SelectItem>
                <SelectItem value="read">{t('communication.read')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">{t('communication.noAnnouncementsFound')}</p>
              <p className="text-sm">{t('communication.noInboxMatches')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => {
            const TypeIcon = typeIcon(row.channel);
            const isRead = Boolean(row.readAt);
            const title = localizedText(row.titleEn, row.titleFr, locale);
            const body = localizedText(row.bodyEn, row.bodyFr, locale);

            return (
              <Card key={row.id} className={!isRead ? 'border-primary' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className={`font-semibold ${!isRead ? 'text-primary' : ''}`}>
                          {title || t('communication.noTitle')}
                        </h3>
                        {!isRead ? (
                          <Badge variant="primary" className="ml-2">
                            {t('communication.newBadge')}
                          </Badge>
                        ) : null}
                        <Badge variant={priorityBadgeVariant(row.priority)}>{row.priority}</Badge>
                        <Badge variant="outline">{alertChannelLabel(row.channel, locale)}</Badge>
                        <Badge variant="secondary">{row.status.toLowerCase()}</Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {body || t('communication.noContent')}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {t('communication.received')}: {new Date(row.createdAt).toLocaleString()}
                        </span>
                        {row.readAt ? (
                          <span className="text-green-600">
                            {t('communication.read')}: {new Date(row.readAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!isRead ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markAlertRead.isPending}
                        onClick={() => markAlertRead.mutate(row.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('communication.markAsRead')}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(query.data?.length ?? 0) >= inboxLimit ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setInboxLimit((current) => current + ALERT_INBOX_PAGE_SIZE)}
            >
              {t('communication.loadMore')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
