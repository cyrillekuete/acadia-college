'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  Copy,
  Edit,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnnouncementGroupForm } from '@/components/acadia/announcements/announcement-group-form';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { TimePickerInput } from '@/components/acadia/forms/time-picker-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { AlertGroupFormValues } from '@/lib/acadia/alert-schemas';
import { ALERT_TEMPLATES, type AlertTemplate } from '@/lib/acadia/alert-templates';
import type { AlertChannel, AlertPriority } from '@/lib/acadia/alerts';
import { alertChannelLabel } from '@/lib/acadia/alerts';
import { getUiLocale, localizedText } from '@/lib/acadia/locale';
import { useAlertMutations } from '@/hooks/use-alert-mutations';
import { useAlertTargets } from '@/hooks/use-alert-targets';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchWhatsAppConfigured } from '@/lib/acadia/whatsapp-request';
import { useTranslation } from '@/hooks/useTranslation';

type HistoryRow = {
  id: string;
  titleEn: string;
  titleFr: string;
  bodyEn: string | null;
  bodyFr: string | null;
  priority: string;
  channel: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

const TEMPLATE_ICONS = {
  'meeting-reminder': Calendar,
  'exam-schedule': FileText,
  'fee-reminder': AlertCircle,
  'school-closure': Bell,
  'event-invitation': Calendar,
} as const;

function priorityBadgeVariant(priority: string) {
  if (priority === 'urgent') return 'destructive' as const;
  if (priority === 'high') return 'default' as const;
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

function matchesStatusFilter(status: string, filter: string) {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'failed') {
    return status === 'CANCELLED';
  }
  return status.toLowerCase() === filter;
}

export function AnnouncementsWorkspace() {
  const { t } = useTranslation();
  const locale = getUiLocale();
  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const targetsQuery = useAlertTargets();
  const { saveAlert, deleteAlert, deleteAlertGroup } = useAlertMutations();
  const groups = targetsQuery.data?.options ?? [];

  const [selectedTab, setSelectedTab] = useState('compose');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [alertType, setAlertType] = useState<AlertChannel>('whatsapp');
  const [priority, setPriority] = useState<AlertPriority>('normal');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>();
  const [groupDefaults, setGroupDefaults] = useState<Partial<AlertGroupFormValues>>({});

  const historyQuery = useQuery({
    queryKey: ['school-alerts', 'history', tenantId],
    queryFn: async (): Promise<HistoryRow[]> => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('SchoolAlert')
        .select(
          'id, titleEn, titleFr, bodyEn, bodyFr, priority, channel, status, scheduledAt, sentAt, createdAt',
        )
        .eq('tenantId', tenantId!)
        .order('createdAt', { ascending: false })
        .limit(100);
      if (error) {
        throw error;
      }
      return (data ?? []) as HistoryRow[];
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const whatsappQuery = useQuery({
    queryKey: ['whatsapp-configured'],
    queryFn: fetchWhatsAppConfigured,
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });
  const whatsappConfigured = whatsappQuery.data === true;

  const alerts = historyQuery.data ?? [];
  const isLoading = targetsQuery.isLoading || historyQuery.isLoading;
  const error = targetsQuery.error ?? historyQuery.error;
  const allGuardiansCount = groups.find((group) => group.kind === 'all')?.count ?? 0;

  const filteredAlerts = alerts.filter((alert) => {
    const alertTitle = localizedText(alert.titleEn, alert.titleFr, locale);
    const alertBody = localizedText(alert.bodyEn, alert.bodyFr, locale);
    const matchesSearch =
      !searchQuery ||
      alertTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alertBody.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && matchesStatusFilter(alert.status, statusFilter);
  });

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const handleUseTemplate = (template: AlertTemplate) => {
    setTitle(locale === 'fr' ? template.titleFr : template.titleEn);
    setContent(locale === 'fr' ? template.bodyFr : template.bodyEn);
    setSelectedTemplate(template.id);
    setSelectedTab('compose');
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('communication.validationTitleContent'));
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error(t('communication.validationGroups'));
      return;
    }

    const scheduledAt =
      scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : '';
    const text = title.trim();
    const body = content.trim();

    try {
      await saveAlert.mutateAsync({
        values: {
          titleEn: text,
          titleFr: text,
          bodyEn: body,
          bodyFr: body,
          priority,
          channel: alertType,
          targetKeys: selectedGroups,
          scheduledAt,
          sendNow: !scheduledAt,
        },
        academicYearId: targetsQuery.data?.academicYearId ?? null,
      });
    } catch {
      return;
    }

    setTitle('');
    setContent('');
    setSelectedGroups([]);
    setScheduledDate('');
    setScheduledTime('');
    setSelectedTemplate('');
    setSelectedTab('history');
  };

  const handleDelete = async (alertId: string) => {
    if (!window.confirm(t('communication.deleteConfirm'))) {
      return;
    }
    try {
      await deleteAlert.mutateAsync(alertId);
    } catch {
      return;
    }
  };

  const openCreateGroup = () => {
    setEditingGroupId(undefined);
    setGroupDefaults({ name: '', description: '', guardianUserIds: [] });
    setGroupDialogOpen(true);
  };

  const openEditGroup = async (groupKey: string, name: string, description?: string) => {
    const groupId = groupKey.startsWith('group:') ? groupKey.slice('group:'.length) : '';
    if (!groupId || !tenantId) {
      return;
    }
    const supabase = requireBrowserClient();
    const { data, error: membersError } = await supabase
      .from('SchoolAlertGroupMember')
      .select('guardianUserId')
      .eq('tenantId', tenantId)
      .eq('groupId', groupId);
    if (membersError) {
      toast.error(membersError.message);
      return;
    }
    setEditingGroupId(groupId);
    setGroupDefaults({
      name,
      description: description ?? '',
      guardianUserIds: (data ?? []).map((row) => row.guardianUserId as string),
    });
    setGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (groupKey: string) => {
    const groupId = groupKey.startsWith('group:') ? groupKey.slice('group:'.length) : '';
    if (!groupId) {
      return;
    }
    if (!window.confirm(t('communication.deleteGroupConfirm'))) {
      return;
    }
    try {
      await deleteAlertGroup.mutateAsync(groupId);
    } catch {
      return;
    }
  };

  const groupDescription = (kind: 'all' | 'class' | 'group', description?: string) => {
    if (kind === 'all') {
      return t('communication.allGuardiansDescription');
    }
    if (kind === 'class') {
      return t('communication.classGroupDescription');
    }
    return description?.trim() || t('communication.noGroupDescription');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('communication.workspaceTitle')}</h1>
          <p className="text-muted-foreground">{t('communication.workspaceDescription')}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => toast.info(t('communication.settingsComingSoon'))}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t('communication.settings')}
          </Button>
          <Button onClick={() => setSelectedTab('compose')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('communication.quickAnnouncement')}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error instanceof Error ? error.message : t('common.messages.error')}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('communication.totalGuardians')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allGuardiansCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('communication.registeredGuardians')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('communication.announcementsSent')}
            </CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('communication.totalAnnouncementsSent')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('communication.scheduled')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter((alert) => alert.status === 'SCHEDULED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('communication.pendingAnnouncements')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('communication.guardianGroups')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground">{t('communication.availableGroups')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">{t('communication.composeTab')}</TabsTrigger>
          <TabsTrigger value="templates">{t('communication.templatesTab')}</TabsTrigger>
          <TabsTrigger value="history">{t('communication.historyTab')}</TabsTrigger>
          <TabsTrigger value="groups">{t('communication.groupsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('communication.composeTitle')}</CardTitle>
                  <CardDescription>{t('communication.composeDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-title">{t('communication.titleLabel')}</Label>
                    <Input
                      id="announcement-title"
                      placeholder={t('communication.titlePlaceholder')}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="announcement-content">
                      {t('communication.contentLabel')}
                    </Label>
                    <Textarea
                      id="announcement-content"
                      placeholder={t('communication.contentPlaceholder')}
                      rows={6}
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('communication.typeLabel')}</Label>
                      <Select
                        value={alertType}
                        onValueChange={(value) => setAlertType(value as AlertChannel)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">
                            {t('communication.whatsapp')}
                          </SelectItem>
                          <SelectItem value="sms">{t('communication.smsOnly')}</SelectItem>
                          <SelectItem value="email">{t('communication.emailOnly')}</SelectItem>
                          <SelectItem value="both">{t('communication.smsAndEmail')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {alertType === 'whatsapp' && whatsappQuery.isFetched && !whatsappConfigured ? (
                        <p className="text-xs text-destructive">
                          {t('communication.whatsappNotConfigured')}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label>{t('communication.priorityLabel')}</Label>
                      <Select
                        value={priority}
                        onValueChange={(value) => setPriority(value as AlertPriority)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            {t('communication.priorityLabels.low')}
                          </SelectItem>
                          <SelectItem value="normal">
                            {t('communication.priorityLabels.normal')}
                          </SelectItem>
                          <SelectItem value="high">
                            {t('communication.priorityLabels.high')}
                          </SelectItem>
                          <SelectItem value="urgent">
                            {t('communication.priorityLabels.urgent')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-date">{t('communication.scheduleDate')}</Label>
                      <DatePickerInput
                        id="scheduled-date"
                        value={scheduledDate}
                        onChange={(value) => {
                          setScheduledDate(value);
                          if (!value) {
                            setScheduledTime('');
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time">{t('communication.scheduleTime')}</Label>
                      <TimePickerInput
                        id="scheduled-time"
                        value={scheduledTime}
                        onChange={setScheduledTime}
                        disabled={!scheduledDate}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => void handleSend()}
                      disabled={saveAlert.isPending || isLoading}
                    >
                      {saveAlert.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('communication.sending')}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {scheduledDate && scheduledTime
                            ? t('communication.scheduleAnnouncement')
                            : t('communication.sendAnnouncement')}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('communication.selectGroups')}</CardTitle>
                  <CardDescription>{t('communication.selectGroupsDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {targetsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {groups.map((group) => (
                        <div key={group.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={group.key}
                            checked={selectedGroups.includes(group.key)}
                            onCheckedChange={() => handleGroupToggle(group.key)}
                          />
                          <Label htmlFor={group.key} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{group.label}</span>
                              <Badge variant="outline">{group.count}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {groupDescription(group.kind, group.description)}
                            </p>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('communication.quickTemplates')}</CardTitle>
                  <CardDescription>
                    {t('communication.quickTemplatesDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ALERT_TEMPLATES.slice(0, 3).map((template) => {
                      const Icon = TEMPLATE_ICONS[template.id];
                      return (
                        <Button
                          key={template.id}
                          variant={selectedTemplate === template.id ? 'secondary' : 'outline'}
                          className="h-auto w-full justify-start p-3"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium">
                              {locale === 'fr' ? template.titleFr : template.titleEn}
                            </div>
                            <div className="text-xs text-muted-foreground">{template.category}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ALERT_TEMPLATES.map((template) => {
              const Icon = TEMPLATE_ICONS[template.id];
              const templateTitle = locale === 'fr' ? template.titleFr : template.titleEn;
              const templateBody = locale === 'fr' ? template.bodyFr : template.bodyEn;
              return (
                <Card key={template.id} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{templateTitle}</CardTitle>
                      </div>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
                      {templateBody}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {t('communication.useTemplate')}
                      </Button>
                      <Button size="sm" variant="outline" disabled>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('communication.searchAnnouncements')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('communication.statusFilter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('communication.allStatus')}</SelectItem>
                <SelectItem value="sent">{t('communication.alertStatus.SENT')}</SelectItem>
                <SelectItem value="scheduled">
                  {t('communication.alertStatus.SCHEDULED')}
                </SelectItem>
                <SelectItem value="draft">{t('communication.alertStatus.DRAFT')}</SelectItem>
                <SelectItem value="failed">{t('communication.failedStatus')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  {t('communication.noAnnouncementsFound')}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => {
                const TypeIcon = typeIcon(alert.channel);
                const alertTitle = localizedText(alert.titleEn, alert.titleFr, locale);
                const alertBody = localizedText(alert.bodyEn, alert.bodyFr, locale);
                return (
                  <Card key={alert.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="font-semibold">{alertTitle}</h3>
                            <Badge variant={priorityBadgeVariant(alert.priority)}>
                              {alert.priority}
                            </Badge>
                            <Badge variant="outline">
                              <TypeIcon className="mr-1 h-3 w-3" />
                              {alertChannelLabel(alert.channel, locale)}
                            </Badge>
                            <Badge variant="secondary">{alert.status.toLowerCase()}</Badge>
                          </div>
                          <p className="mb-3 text-sm text-muted-foreground">{alertBody}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {alert.sentAt ? (
                              <span>
                                {t('communication.sentAt')}:{' '}
                                {new Date(alert.sentAt).toLocaleString()}
                              </span>
                            ) : null}
                            {alert.scheduledAt ? (
                              <span>
                                {t('communication.scheduled')}:{' '}
                                {new Date(alert.scheduledAt).toLocaleString()}
                              </span>
                            ) : null}
                            {!alert.sentAt && !alert.scheduledAt ? (
                              <span>
                                {t('communication.createdAt')}:{' '}
                                {new Date(alert.createdAt).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTitle(alertTitle);
                              setContent(alertBody);
                              setSelectedTab('compose');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDelete(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('communication.groupsManagement')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('communication.groupsManagementDescription')}
              </p>
            </div>
            <Button onClick={openCreateGroup}>
              <Plus className="mr-2 h-4 w-4" />
              {t('communication.createGroup')}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {targetsQuery.isLoading ? (
              <div className="col-span-3 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              groups.map((group) => (
                <Card key={group.key} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{group.label}</CardTitle>
                      <Badge variant="outline">
                        {t('communication.guardiansCount', { count: group.count })}
                      </Badge>
                    </div>
                    <CardDescription>
                      {groupDescription(group.kind, group.description)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={group.kind !== 'group'}
                        onClick={() =>
                          void openEditGroup(group.key, group.label, group.description)
                        }
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {t('communication.viewMembers')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={group.kind !== 'group'}
                        onClick={() =>
                          void openEditGroup(group.key, group.label, group.description)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={group.kind !== 'group' || deleteAlertGroup.isPending}
                        onClick={() => void handleDeleteGroup(group.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroupId
                ? t('communication.updateGroup')
                : t('communication.createGroup')}
            </DialogTitle>
            <DialogDescription>
              {t('communication.groupsManagementDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <AnnouncementGroupForm
              key={editingGroupId ?? 'new'}
              groupId={editingGroupId}
              defaultValues={groupDefaults}
              onCancel={() => setGroupDialogOpen(false)}
              onSaved={() => setGroupDialogOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
