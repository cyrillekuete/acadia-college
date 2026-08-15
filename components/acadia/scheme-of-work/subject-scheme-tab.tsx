'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SchemeCreateSheet } from '@/components/acadia/scheme-of-work/scheme-create-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSchemeSubjectOptions,
  useSubjectLevelsForScheme,
  useSubjectYearSchemes,
} from '@/hooks/use-scheme-of-work';
import { localizedText } from '@/lib/acadia/locale';
import { useTranslation } from '@/hooks/useTranslation';

export function SubjectSchemeTab({
  subjectId,
  canManage,
}: {
  subjectId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const levelsQuery = useSubjectLevelsForScheme(subjectId);
  const schemesQuery = useSubjectYearSchemes(subjectId);
  const subjectsQuery = useSchemeSubjectOptions();
  const subject = subjectsQuery.data?.find((row) => row.id === subjectId);
  const subjectName =
    localizedText(subject?.nameEn, subject?.nameFr) || subject?.nameEn || '';
  const [createLevel, setCreateLevel] = useState<{
    levelId: string;
    levelName: string;
  } | null>(null);

  if (levelsQuery.isLoading || schemesQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const levels = levelsQuery.data ?? [];
  const schemes = schemesQuery.data ?? [];
  const schemeByLevel = new Map(schemes.map((row) => [row.levelId, row]));

  if (levels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('schemeOfWork.noSubjectLevels')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('schemeOfWork.subjectTabDescription')}
      </p>
      <ul className="divide-y rounded-md border">
        {levels.map((level) => {
          const scheme = schemeByLevel.get(level.levelId);
          return (
            <li
              key={level.levelId}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{level.levelName}</span>
                <Badge
                  variant={scheme?.status === 'PUBLISHED' ? 'success' : 'secondary'}
                  appearance="light"
                >
                  {scheme
                    ? t(`schemeOfWork.status.${scheme.status}`)
                    : t('schemeOfWork.status.NONE')}
                </Badge>
              </div>
              {scheme ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/scheme-of-work/${scheme.schemeId}`)}
                >
                  {canManage
                    ? t('schemeOfWork.openScheme')
                    : t('schemeOfWork.viewScheme')}
                </Button>
              ) : canManage ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    setCreateLevel({
                      levelId: level.levelId,
                      levelName: level.levelName,
                    })
                  }
                >
                  {t('schemeOfWork.createScheme')}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t('schemeOfWork.notPublished')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <SchemeCreateSheet
        open={!!createLevel}
        onOpenChange={(open) => {
          if (!open) {
            setCreateLevel(null);
          }
        }}
        subjectId={subjectId}
        levelId={createLevel?.levelId ?? ''}
        subjectName={subjectName}
        levelName={createLevel?.levelName ?? ''}
      />
    </div>
  );
}
