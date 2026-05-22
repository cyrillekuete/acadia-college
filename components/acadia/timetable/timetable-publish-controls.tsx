'use client';

import { LoaderCircleIcon } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useActiveYearTimetablePublish,
  useTimetablePublishMutations,
} from '@/hooks/use-timetable-publish';
import { formatDateTime } from '@/lib/acadia/record-display';
import {
  isTimetablePublished,
  timetablePublishStatusLabel,
} from '@/lib/acadia/timetable-publish';

export function TimetablePublishControls() {
  const { activeYearId, publishedAt } = useActiveYearTimetablePublish();
  const { publishTimetable, unpublishTimetable } = useTimetablePublishMutations();

  if (!activeYearId) {
    return null;
  }

  const status = timetablePublishStatusLabel(publishedAt);
  const pending = publishTimetable.isPending || unpublishTimetable.isPending;

  function handlePublish() {
    publishTimetable.mutate(activeYearId!);
  }

  function handleUnpublish() {
    if (
      !window.confirm(
        'Unpublish this timetable? Students, teachers, and guardians will no longer see it until you publish again.',
      )
    ) {
      return;
    }
    unpublishTimetable.mutate(activeYearId!);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Timetable status</span>
          <Badge variant={status === 'published' ? 'success' : 'secondary'}>
            {status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {isTimetablePublished(publishedAt)
            ? `Published ${formatDateTime(publishedAt)}. Non-administrators can view timetables for this year.`
            : 'Only administrators can view timetables until you publish.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'draft' ? (
          <Button type="button" disabled={pending} onClick={handlePublish}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Publish timetable
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleUnpublish}
          >
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            Unpublish
          </Button>
        )}
      </div>
    </div>
  );
}
