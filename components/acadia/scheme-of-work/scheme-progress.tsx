'use client';

import { Progress } from '@/components/ui/progress';
import { schemeProgressPercent } from '@/lib/acadia/scheme-of-work';
import { useTranslation } from '@/hooks/useTranslation';

export function SchemeProgress({
  completedCount,
  topicCount,
}: {
  completedCount: number;
  topicCount: number;
}) {
  const { t } = useTranslation();
  const percent = schemeProgressPercent(completedCount, topicCount);
  const remaining = Math.max(0, topicCount - completedCount);

  return (
    <div className="space-y-1.5">
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {t('schemeOfWork.progressSummary', {
          completed: completedCount,
          total: topicCount,
          remaining,
          percent,
        })}
      </p>
    </div>
  );
}
