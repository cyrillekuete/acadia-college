'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { SchemeTopicBoard } from '@/components/acadia/scheme-of-work/scheme-topic-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSchemeDetail,
  useSchemeTopics,
} from '@/hooks/use-scheme-of-work';
import { useSchemeOfWorkMutations } from '@/hooks/use-scheme-of-work-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export function SchemeCreateSheet({
  open,
  onOpenChange,
  subjectId,
  levelId,
  subjectName,
  levelName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  levelId: string;
  subjectName: string;
  levelName: string;
}) {
  const { t } = useTranslation();
  const [schemeId, setSchemeId] = useState<string | null>(null);
  const {
    openOrCreateScheme,
    setSchemeStatus,
    saveTopic,
    removeTopic,
    moveTopic,
  } = useSchemeOfWorkMutations();
  const createScheme = openOrCreateScheme.mutate;

  useEffect(() => {
    if (!open || !subjectId || !levelId) {
      return;
    }
    let cancelled = false;
    createScheme(
      { subjectId, levelId },
      {
        onSuccess: (scheme) => {
          if (!cancelled) {
            setSchemeId(scheme.id);
          }
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, subjectId, levelId, createScheme]);

  const detailQuery = useSchemeDetail(open ? schemeId : null);
  const topicsQuery = useSchemeTopics(open ? schemeId : null);

  const scheme = detailQuery.data;
  const topics = topicsQuery.data ?? [];
  const published = scheme?.status === 'PUBLISHED';
  const title = [subjectName || scheme?.subjectName, levelName || scheme?.levelName]
    .filter(Boolean)
    .join(' · ');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSchemeId(null);
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="inset-5 start-auto h-auto gap-0 rounded-lg p-0 sm:w-[840px] sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">
            {title || t('schemeOfWork.createSheetTitle')}
          </SheetTitle>
          <SheetDescription className="px-3 pb-2">
            {t('schemeOfWork.createSheetDescription')}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-12.5rem)]">
            <div className="space-y-4 px-5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {scheme ? (
                  <Badge
                    variant={published ? 'success' : 'secondary'}
                    appearance="light"
                  >
                    {t(`schemeOfWork.status.${scheme.status}`)}
                  </Badge>
                ) : null}
                <CurrentAcademicYearBadge />
              </div>
              {!schemeId ||
              openOrCreateScheme.isPending ||
              detailQuery.isLoading ||
              topicsQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : openOrCreateScheme.isError ||
                detailQuery.isError ||
                topicsQuery.isError ? (
                <p className="text-destructive text-sm">
                  {t('schemeOfWork.loadFailed')}
                </p>
              ) : scheme ? (
                <SchemeTopicBoard
                  topics={topics}
                  canEdit
                  canMark={false}
                  pending={
                    saveTopic.isPending ||
                    removeTopic.isPending ||
                    moveTopic.isPending
                  }
                  onSaveTopic={({ topicId, values }) =>
                    saveTopic.mutate({ schemeId: scheme.id, topicId, values })
                  }
                  onDeleteTopic={(topicId) => removeTopic.mutate(topicId)}
                  onMoveTopic={(orderedTopicIds) =>
                    moveTopic.mutate({ orderedTopicIds })
                  }
                  onToggleProgress={() => undefined}
                />
              ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-border justify-between gap-2 border-t p-5 sm:justify-between">
          <div>
            {schemeId ? (
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href={`/scheme-of-work/${schemeId}`}>
                  {t('schemeOfWork.openFullPage')}
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.buttons.close')}
            </Button>
            {scheme ? (
              <Button
                type="button"
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
