'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { SchemeTopicFormSheet } from '@/components/acadia/scheme-of-work/topic-form-sheet';
import { sanitizeHtml } from '@/lib/acadia/sanitize-html';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTime } from '@/lib/acadia/record-display';
import {
  groupTopicsByTermAndWeek,
  topicDescription,
  topicTitle,
  type SchemeTermOption,
  type SchemeTopicWithProgress,
} from '@/lib/acadia/scheme-of-work';
import type { SchemeOfWorkTopicFormValues } from '@/lib/acadia/scheme-of-work-schemas';
import { useTranslation } from '@/hooks/useTranslation';

type TopicDialogState = {
  open: boolean;
  topicId?: string;
  values?: Partial<SchemeOfWorkTopicFormValues>;
};

export function SchemeTopicBoard({
  topics,
  terms,
  canEdit,
  canMark,
  pending,
  onSaveTopic,
  onDeleteTopic,
  onMoveTopic,
  onToggleProgress,
}: {
  topics: SchemeTopicWithProgress[];
  terms: SchemeTermOption[];
  canEdit: boolean;
  canMark: boolean;
  pending?: boolean;
  onSaveTopic: (input: {
    topicId?: string;
    values: SchemeOfWorkTopicFormValues;
  }) => void;
  onDeleteTopic: (topicId: string) => void;
  onMoveTopic: (orderedTopicIds: string[]) => void;
  onToggleProgress: (topic: SchemeTopicWithProgress, completed: boolean) => void;
}) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<TopicDialogState>({ open: false });
  const groups = useMemo(
    () => groupTopicsByTermAndWeek(topics, terms),
    [topics, terms],
  );

  const moveWithinWeek = (
    weekTopics: SchemeTopicWithProgress[],
    topicId: string,
    direction: -1 | 1,
  ) => {
    const index = weekTopics.findIndex((topic) => topic.id === topicId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= weekTopics.length) {
      return;
    }
    const ordered = weekTopics.map((topic) => topic.id);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(next, 0, moved);
    onMoveTopic(ordered);
  };

  return (
    <div className="space-y-5">
      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              setDialog({
                open: true,
                values: { termId: terms[0]?.id ?? '', weekNumber: 1 },
              })
            }
          >
            <Plus className="size-4" />
            {t('schemeOfWork.addTopic')}
          </Button>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('schemeOfWork.noTerms')}</p>
      ) : null}

      {groups.map((term) => (
        <Card key={term.termId}>
          <CardHeader>
            <CardTitle>
              {term.termNumber > 0
                ? t('schemeOfWork.termN', { number: term.termNumber })
                : t('schemeOfWork.term')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {term.weeks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('schemeOfWork.noTopicsInTerm')}
              </p>
            ) : null}
            {term.weeks.map((week) => (
              <div key={`${term.termId}-${week.weekNumber}`} className="space-y-2">
                <h3 className="text-sm font-medium">
                  {t('schemeOfWork.weekN', { number: week.weekNumber })}
                </h3>
                <ul className="space-y-2">
                  {week.topics.map((topic, index) => {
                    const description = topicDescription(topic);
                    return (
                      <li
                        key={topic.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        {canMark ? (
                          <Checkbox
                            checked={topic.completed}
                            disabled={pending}
                            onCheckedChange={(checked) =>
                              onToggleProgress(topic, checked === true)
                            }
                            aria-label={topicTitle(topic)}
                            className="mt-0.5"
                          />
                        ) : (
                          <Badge
                            variant={topic.completed ? 'success' : 'secondary'}
                            appearance="light"
                            className="mt-0.5"
                          >
                            {topic.completed
                              ? t('schemeOfWork.done')
                              : t('schemeOfWork.pending')}
                          </Badge>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{topicTitle(topic)}</p>
                          {description ? (
                            <div
                              className="text-muted-foreground mt-1 text-sm [&_a]:text-primary [&_a]:underline [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ps-5"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeHtml(description),
                              }}
                            />
                          ) : null}
                          {topic.completed && topic.completedAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('schemeOfWork.completedAt', {
                                date: formatDateTime(topic.completedAt),
                              })}
                            </p>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === 0 || pending}
                              onClick={() => moveWithinWeek(week.topics, topic.id, -1)}
                              aria-label={t('schemeOfWork.moveUp')}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === week.topics.length - 1 || pending}
                              onClick={() => moveWithinWeek(week.topics, topic.id, 1)}
                              aria-label={t('schemeOfWork.moveDown')}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDialog({
                                  open: true,
                                  topicId: topic.id,
                                  values: {
                                    termId: topic.termId,
                                    weekNumber: topic.weekNumber,
                                    titleEn: topic.titleEn,
                                    titleFr: topic.titleFr,
                                    descriptionEn: topic.descriptionEn ?? '',
                                    descriptionFr: topic.descriptionFr ?? '',
                                  },
                                })
                              }
                              aria-label={t('common.buttons.edit')}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (
                                  window.confirm(t('schemeOfWork.deleteTopicConfirm'))
                                ) {
                                  onDeleteTopic(topic.id);
                                }
                              }}
                              aria-label={t('common.buttons.delete')}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <SchemeTopicFormSheet
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
        terms={terms}
        defaultValues={dialog.values}
        pending={pending}
        onSubmit={(values) => {
          onSaveTopic({ topicId: dialog.topicId, values });
          setDialog({ open: false });
        }}
      />
    </div>
  );
}
