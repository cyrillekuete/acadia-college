'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { SchemeCreateSheet } from '@/components/acadia/scheme-of-work/scheme-create-sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminSchemeCatalog } from '@/hooks/use-scheme-of-work';
import { useSchemeOfWorkMutations } from '@/hooks/use-scheme-of-work-mutations';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { previousAcademicYearId, filterAdminSchemeCatalog } from '@/lib/acadia/scheme-of-work';
import { useTranslation } from '@/hooks/useTranslation';

type CreateTarget = {
  subjectId: string;
  levelId: string;
  subjectName: string;
  levelName: string;
};

export function AdminSchemeCatalog() {
  const { t } = useTranslation();
  const router = useRouter();
  const { catalog, isLoading, isError } = useAdminSchemeCatalog();
  const { years, activeYearId } = useActiveAcademicYear();
  const { copyFromYear } = useSchemeOfWorkMutations();
  const previousYearId = previousAcademicYearId(years, activeYearId);
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [expandedInitialized, setExpandedInitialized] = useState(false);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);

  const filtered = useMemo(
    () => filterAdminSchemeCatalog(catalog, query),
    [catalog, query],
  );

  useEffect(() => {
    if (!expandedInitialized && catalog.length > 0) {
      setOpenItems(catalog.map((subject) => subject.subjectId));
      setExpandedInitialized(true);
    }
  }, [catalog, expandedInitialized]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive">{t('schemeOfWork.loadFailed')}</p>
    );
  }

  return (
    <div className="space-y-4">
      {previousYearId ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={copyFromYear.isPending}
            onClick={() => {
              if (
                window.confirm(t('schemeOfWork.copyFromPreviousYearConfirm'))
              ) {
                copyFromYear.mutate({ sourceYearId: previousYearId });
              }
            }}
          >
            {t('schemeOfWork.copyFromPreviousYear')}
          </Button>
        </div>
      ) : null}
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('schemeOfWork.searchSubjectPlaceholder')}
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {query
            ? t('schemeOfWork.noSubjectMatch')
            : t('schemeOfWork.emptyList')}
        </p>
      ) : (
        <Accordion
          type="multiple"
          variant="outline"
          value={openItems}
          onValueChange={(value) =>
            setOpenItems(Array.isArray(value) ? value : [value])
          }
        >
          {filtered.map((subject) => (
            <AccordionItem key={subject.subjectId} value={subject.subjectId}>
              <AccordionTrigger>
                <span className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <span className="truncate font-medium">
                    {subject.subjectName}
                  </span>
                  {subject.subjectCode ? (
                    <span className="text-muted-foreground shrink-0 text-sm font-normal">
                      {subject.subjectCode}
                    </span>
                  ) : null}
                  <Badge variant="secondary" appearance="light" className="shrink-0">
                    {t('schemeOfWork.levelsCount', {
                      count: subject.levels.length,
                    })}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {subject.levels.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t('schemeOfWork.noSubjectLevels')}
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {subject.levels.map((level) => (
                      <li
                        key={level.levelId}
                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{level.levelName}</span>
                          <Badge
                            variant={
                              level.status === 'PUBLISHED'
                                ? 'success'
                                : 'secondary'
                            }
                            appearance="light"
                          >
                            {level.status
                              ? t(`schemeOfWork.status.${level.status}`)
                              : t('schemeOfWork.status.NONE')}
                          </Badge>
                          {level.schemeId ? (
                            <span className="text-muted-foreground text-sm">
                              {t('schemeOfWork.topicCount', {
                                count: level.topicCount,
                              })}
                            </span>
                          ) : null}
                        </div>
                        {level.schemeId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/scheme-of-work/${level.schemeId}`)
                            }
                          >
                            {t('schemeOfWork.openScheme')}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              setCreateTarget({
                                subjectId: subject.subjectId,
                                levelId: level.levelId,
                                subjectName: subject.subjectName,
                                levelName: level.levelName,
                              })
                            }
                          >
                            {t('schemeOfWork.createScheme')}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <SchemeCreateSheet
        open={!!createTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTarget(null);
          }
        }}
        subjectId={createTarget?.subjectId ?? ''}
        levelId={createTarget?.levelId ?? ''}
        subjectName={createTarget?.subjectName ?? ''}
        levelName={createTarget?.levelName ?? ''}
      />
    </div>
  );
}
