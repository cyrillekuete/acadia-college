'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchemeProgress } from '@/components/acadia/scheme-of-work/scheme-progress';
import type { SchemeListItem } from '@/lib/acadia/scheme-of-work';
import { useTranslation } from '@/hooks/useTranslation';

function schemeHref(item: SchemeListItem): string | null {
  if (!item.schemeId) {
    return null;
  }
  const params = new URLSearchParams();
  if (item.classId) {
    params.set('classId', item.classId);
  }
  const query = params.toString();
  return query
    ? `/scheme-of-work/${item.schemeId}?${query}`
    : `/scheme-of-work/${item.schemeId}`;
}

export function SchemeListCards({ items }: { items: SchemeListItem[] }) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('schemeOfWork.emptyList')}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const href = schemeHref(item);
        const title = item.className
          ? `${item.subjectName} · ${item.className}`
          : item.subjectName;

        return (
          <Card key={`${item.subjectId}:${item.classId ?? item.levelId}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {href ? (
                    <Link href={href} className="text-primary hover:underline">
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </CardTitle>
                <Badge
                  variant={item.status === 'PUBLISHED' ? 'success' : 'secondary'}
                  appearance="light"
                >
                  {item.status
                    ? t(`schemeOfWork.status.${item.status}`)
                    : t('schemeOfWork.status.NONE')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[item.subjectCode, item.levelName].filter(Boolean).join(' · ')}
              </p>
            </CardHeader>
            <CardContent>
              {item.schemeId ? (
                <SchemeProgress
                  completedCount={item.completedCount}
                  topicCount={item.topicCount}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('schemeOfWork.notPublished')}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
