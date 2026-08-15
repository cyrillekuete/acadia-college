'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { RecordDetailShell } from '@/components/acadia/record-detail-shell';
import { SchemeProgress } from '@/components/acadia/scheme-of-work/scheme-progress';
import { SchemeTopicBoard } from '@/components/acadia/scheme-of-work/scheme-topic-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useLinkedAcadiaProfile } from '@/hooks/use-linked-acadia-profile';
import {
  useSchemeDetail,
  useSchemeTerms,
  useSchemeTopics,
} from '@/hooks/use-scheme-of-work';
import { useSchemeOfWorkMutations } from '@/hooks/use-scheme-of-work-mutations';
import { canWriteOperations, canWriteRegistry, isStudent } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export function SchemeDetailView({ schemeId }: { schemeId: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const classIdFromQuery = searchParams.get('classId');
  const { data: session } = useAcadiaCollegeSession();
  const roleSlug = session?.roleSlug;
  const admin = canWriteRegistry(roleSlug);
  const teacherOps = canWriteOperations(roleSlug) && !admin;
  const studentView = isStudent(roleSlug);
  const profileQuery = useLinkedAcadiaProfile({ includeEnrollment: studentView });
  const classId = classIdFromQuery || profileQuery.data?.enrollment?.classId || null;

  const detailQuery = useSchemeDetail(schemeId);
  const topicsQuery = useSchemeTopics(schemeId, classId);
  const termsQuery = useSchemeTerms(detailQuery.data?.academicYearId ?? null);
  const {
    setSchemeStatus,
    saveTopic,
    removeTopic,
    moveTopic,
    setTopicProgress,
  } = useSchemeOfWorkMutations();

  const scheme = detailQuery.data;
  const topics = topicsQuery.data ?? [];
  const terms = termsQuery.data ?? [];
  const completedCount = topics.filter((topic) => topic.completed).length;
  const published = scheme?.status === 'PUBLISHED';
  const canEdit = admin;
  const canMark = Boolean(classId) && published && (teacherOps || admin);
  const hideDraftFromNonAdmin = !admin && scheme && !published;

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
                disabled={setSchemeStatus.isPending}
                onClick={() =>
                  setSchemeStatus.mutate({
                    schemeId: scheme.id,
                    status: published ? 'DRAFT' : 'PUBLISHED',
                  })
                }
              >
                {published
                  ? t('schemeOfWork.unpublish')
                  : t('schemeOfWork.publish')}
              </Button>
            ) : null}
          </div>

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
                terms={terms}
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
                  if (!classId) {
                    return;
                  }
                  setTopicProgress.mutate({
                    topicId: topic.id,
                    classId,
                    subjectId: scheme.subjectId,
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
