'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { SchemeProgress } from '@/components/acadia/scheme-of-work/scheme-progress';
import { SchemeTopicBoard } from '@/components/acadia/scheme-of-work/scheme-topic-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import {
  useSchemeDetail,
  useSchemeTopics,
  useTeacherSchemeList,
} from '@/hooks/use-scheme-of-work';
import { useSchemeOfWorkMutations } from '@/hooks/use-scheme-of-work-mutations';
import { useTranslation } from '@/hooks/useTranslation';
import { canWriteAcademicAdmin, canWriteOperations, isStudent } from '@/lib/acadia/roles';
import {
  resolveAllowedSchemeClassId,
  schemeShouldBlockProgressWrites,
} from '@/lib/acadia/scheme-of-work';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  countSchemeProgressRows,
  fetchClassesForSchemeLevel,
} from '@/lib/supabase/queries/scheme-of-work';

export function SchemeDetailView({ schemeId }: { schemeId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classIdFromQuery = searchParams.get('classId');
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { activeYearId } = useActiveAcademicYear();
  const roleSlug = session?.roleSlug;
  const admin = canWriteAcademicAdmin(roleSlug);
  const teacherOps = canWriteOperations(roleSlug) && !admin;
  const studentView = isStudent(roleSlug);
  const profileQuery = useLinkedAcadiaProfile({ includeEnrollment: studentView });
  const teacherList = useTeacherSchemeList();
  const teacherClassIds = useMemo(
    () =>
      [
        ...new Set(
          (teacherList.data ?? [])
            .map((item) => item.classId)
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    [teacherList.data],
  );
  const classId = resolveAllowedSchemeClassId({
    requestedClassId: classIdFromQuery,
    roleSlug,
    studentClassId: profileQuery.data?.enrollment?.classId ?? null,
    teacherClassIds,
    isAcademicAdmin: admin,
  });

  const detailQuery = useSchemeDetail(schemeId);
  const topicsQuery = useSchemeTopics(schemeId, classId);
  const {
    setSchemeStatus,
    saveTopic,
    removeTopic,
    moveTopic,
    setTopicProgress,
  } = useSchemeOfWorkMutations();

  const scheme = detailQuery.data;
  const topics = topicsQuery.data ?? [];
  const completedCount = topics.filter((topic) => topic.completed).length;
  const published = scheme?.status === 'PUBLISHED';
  const yearMismatch = Boolean(
    scheme &&
      activeYearId &&
      scheme.academicYearId !== activeYearId,
  );
  const progressBlocked = scheme
    ? schemeShouldBlockProgressWrites({
        schemeAcademicYearId: scheme.academicYearId,
        activeYearId,
        status: scheme.status,
      })
    : true;
  const canEdit = admin && !yearMismatch;
  const canMark =
    Boolean(classId) &&
    published &&
    !progressBlocked &&
    (teacherOps || admin);
  const hideDraftFromNonAdmin = !admin && scheme && !published;

  const classOptionsQuery = useQuery({
    queryKey: ['scheme-of-work-level-classes', tenantId, scheme?.levelId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      return fetchClassesForSchemeLevel(supabase, tenantId!, scheme!.levelId);
    },
    enabled:
      admin &&
      !!scheme?.levelId &&
      isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId),
  });

  const setClassIdParam = (nextClassId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextClassId) {
      params.set('classId', nextClassId);
    } else {
      params.delete('classId');
    }
    const query = params.toString();
    router.replace(
      query
        ? `/scheme-of-work/${schemeId}?${query}`
        : `/scheme-of-work/${schemeId}`,
    );
  };

  const handleTogglePublish = async () => {
    if (!scheme) {
      return;
    }
    if (published) {
      const supabase = requireBrowserClient();
      const progressCount = tenantId
        ? await countSchemeProgressRows(supabase, tenantId, scheme.id)
        : 0;
      if (progressCount > 0) {
        const confirmed = window.confirm(
          t('schemeOfWork.unpublishWithProgressConfirm', { count: progressCount }),
        );
        if (!confirmed) {
          return;
        }
      }
      setSchemeStatus.mutate({ schemeId: scheme.id, status: 'DRAFT' });
      return;
    }
    setSchemeStatus.mutate({ schemeId: scheme.id, status: 'PUBLISHED' });
  };

  const title = useMemo(() => {
    if (!scheme) {
      return t('schemeOfWork.details');
    }
    return `${scheme.subjectName} · ${scheme.levelName}`;
  }, [scheme, t]);

  return (
    <RecordDetailShell
      title={title}
      description={t('schemeOfWork.detailsDescription')}
      backHref="/scheme-of-work"
      backLabel={t('schemeOfWork.back')}
      isLoading={detailQuery.isLoading || topicsQuery.isLoading}
      isError={detailQuery.isError || topicsQuery.isError}
      error={detailQuery.error ?? topicsQuery.error}
    >
      {scheme ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={published ? 'success' : 'secondary'}
                appearance="light"
              >
                {t(`schemeOfWork.status.${scheme.status}`)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {scheme.subjectCode} · {scheme.academicYearLabel}
              </span>
              <CurrentAcademicYearBadge />
            </div>
            {admin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  setSchemeStatus.isPending ||
                  yearMismatch ||
                  (!published && topics.length === 0)
                }
                onClick={() => {
                  void handleTogglePublish();
                }}
              >
                {published
                  ? t('schemeOfWork.unpublish')
                  : t('schemeOfWork.publish')}
              </Button>
            ) : null}
          </div>

          {scheme.subjectDeactivatedAt ? (
            <p className="text-sm text-muted-foreground">
              {t('schemeOfWork.subjectDeactivated')}
            </p>
          ) : null}
          {yearMismatch ? (
            <p className="text-sm text-muted-foreground">
              {t('schemeOfWork.yearMismatch', {
                year: scheme.academicYearLabel,
              })}
            </p>
          ) : null}
          {classIdFromQuery && !classId && !admin ? (
            <p className="text-sm text-muted-foreground">
              {t('schemeOfWork.classNotInScope')}
            </p>
          ) : null}

          {admin ? (
            <div className="max-w-sm space-y-1.5">
              <p className="text-sm font-medium">{t('schemeOfWork.classCoverage')}</p>
              <Select
                value={classId ?? undefined}
                onValueChange={setClassIdParam}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('schemeOfWork.selectClassCoverage')} />
                </SelectTrigger>
                <SelectContent>
                  {(classOptionsQuery.data ?? []).map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('schemeOfWork.classMasterMarkHint')}
              </p>
            </div>
          ) : null}

          {hideDraftFromNonAdmin ? (
            <p className="text-sm text-muted-foreground">
              {t('schemeOfWork.notPublished')}
            </p>
          ) : (
            <>
              {(teacherOps || studentView || classId) && topics.length > 0 ? (
                <SchemeProgress
                  completedCount={completedCount}
                  topicCount={topics.length}
                />
              ) : null}
              {teacherOps && !classId ? (
                <p className="text-sm text-muted-foreground">
                  {t('schemeOfWork.selectClassHint')}
                </p>
              ) : null}
              <SchemeTopicBoard
                topics={topics}
                canEdit={canEdit}
                canMark={canMark}
                pending={
                  saveTopic.isPending ||
                  removeTopic.isPending ||
                  moveTopic.isPending ||
                  setTopicProgress.isPending
                }
                onSaveTopic={({ topicId, values }) =>
                  saveTopic.mutate({ schemeId: scheme.id, topicId, values })
                }
                onDeleteTopic={(topicId) => removeTopic.mutate(topicId)}
                onMoveTopic={(orderedTopicIds) =>
                  moveTopic.mutate({ orderedTopicIds })
                }
                onToggleProgress={(topic, completed) => {
                  if (!classId || progressBlocked) {
                    return;
                  }
                  setTopicProgress.mutate({
                    topicId: topic.id,
                    classId,
                    subjectId: scheme.subjectId,
                    schemeAcademicYearId: scheme.academicYearId,
                    completed,
                  });
                }}
              />
            </>
          )}
        </div>
      ) : null}
      {!scheme && !detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('schemeOfWork.notFound')}</p>
      ) : null}
    </RecordDetailShell>
  );
}
