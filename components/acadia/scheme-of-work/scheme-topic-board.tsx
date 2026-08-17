'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ColumnDef,
  ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  PaginationState,
  Row,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { SchemeTopicFormSheet } from '@/components/acadia/scheme-of-work/topic-form-sheet';
import { sanitizeHtml } from '@/lib/acadia/sanitize-html';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { formatDateTime } from '@/lib/acadia/record-display';
import {
  buildTopicTree,
  topicCheckState,
  topicDescription,
  topicTitle,
  type SchemeTopicTreeNode,
  type SchemeTopicWithProgress,
} from '@/lib/acadia/scheme-of-work';
import type { SchemeOfWorkTopicFormValues } from '@/lib/acadia/scheme-of-work-schemas';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

type TopicDialogState = {
  open: boolean;
  topicId?: string;
  values?: Partial<SchemeOfWorkTopicFormValues>;
};

export function SchemeTopicBoard({
  topics,
  canEdit,
  canMark,
  pending,
  onSaveTopic,
  onDeleteTopic,
  onMoveTopic,
  onToggleProgress,
}: {
  topics: SchemeTopicWithProgress[];
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [expanded, setExpanded] = useState<ExpandedState>(true);

  const tree = useMemo(() => buildTopicTree(topics), [topics]);

  const moveSibling = useCallback(
    (siblings: SchemeTopicTreeNode[], topicId: string, direction: -1 | 1) => {
      const index = siblings.findIndex((topic) => topic.id === topicId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= siblings.length) {
        return;
      }
      const ordered = siblings.map((topic) => topic.id);
      const [moved] = ordered.splice(index, 1);
      ordered.splice(next, 0, moved);
      onMoveTopic(ordered);
    },
    [onMoveTopic],
  );

  const columns = useMemo<ColumnDef<SchemeTopicTreeNode>[]>(
    () => [
      {
        id: 'task',
        accessorFn: (row) => topicTitle(row),
        header: t('schemeOfWork.task'),
        cell: ({ row }) => (
          <TopicTaskCell
            row={row}
            canEdit={canEdit}
            canMark={canMark}
            pending={pending}
            roots={tree}
            onAddSubTopic={(parentId) =>
              setDialog({
                open: true,
                values: { parentTopicId: parentId },
              })
            }
            onEdit={(topic) =>
              setDialog({
                open: true,
                topicId: topic.id,
                values: {
                  parentTopicId: topic.parentTopicId ?? '',
                  titleEn: topic.titleEn,
                  titleFr: topic.titleFr,
                  descriptionEn: topic.descriptionEn ?? '',
                  descriptionFr: topic.descriptionFr ?? '',
                },
              })
            }
            onDelete={(topicId) => {
              if (window.confirm(t('schemeOfWork.deleteTopicConfirm'))) {
                onDeleteTopic(topicId);
              }
            }}
            onMove={moveSibling}
            onToggleProgress={onToggleProgress}
          />
        ),
        meta: {
          cellClassName: 'align-top',
        },
      },
    ],
    [canEdit, canMark, moveSibling, pending, t, tree, onDeleteTopic, onToggleProgress],
  );

  const table = useReactTable({
    data: tree,
    columns,
    state: { pagination, expanded },
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getRowId: (row) => row.id,
    getSubRows: (row) => (row.children.length > 0 ? row.children : undefined),
    paginateExpandedRows: false,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => setDialog({ open: true, values: { parentTopicId: '' } })}
          >
            <Plus className="size-4" />
            {t('schemeOfWork.addTopic')}
          </Button>
        </div>
      ) : null}

      <DataGrid
        table={table}
        recordCount={tree.length}
        emptyMessage={t('schemeOfWork.noTopics')}
        tableLayout={{ dense: true, rowBorder: true }}
        tableClassNames={{ edgeCell: 'px-4' }}
      >
        <Card>
          <CardTable>
            <DataGridTable />
          </CardTable>
          {tree.length > 0 ? (
            <CardFooter>
              <DataGridPagination sizes={[5, 10, 25, 50]} />
            </CardFooter>
          ) : null}
        </Card>
      </DataGrid>

      <SchemeTopicFormSheet
        open={dialog.open}
        onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
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

function TopicTaskCell({
  row,
  canEdit,
  canMark,
  pending,
  roots,
  onAddSubTopic,
  onEdit,
  onDelete,
  onMove,
  onToggleProgress,
}: {
  row: Row<SchemeTopicTreeNode>;
  canEdit: boolean;
  canMark: boolean;
  pending?: boolean;
  roots: SchemeTopicTreeNode[];
  onAddSubTopic: (parentId: string) => void;
  onEdit: (topic: SchemeTopicTreeNode) => void;
  onDelete: (topicId: string) => void;
  onMove: (
    siblings: SchemeTopicTreeNode[],
    topicId: string,
    direction: -1 | 1,
  ) => void;
  onToggleProgress: (topic: SchemeTopicWithProgress, completed: boolean) => void;
}) {
  const { t } = useTranslation();
  const topic = row.original;
  const title = topicTitle(topic);
  const description = topicDescription(topic);
  const isRoot = row.depth === 0;
  const siblings = isRoot
    ? roots
    : (roots.find((root) => root.id === topic.parentTopicId)?.children ?? []);
  const siblingIndex = siblings.findIndex((item) => item.id === topic.id);
  const checkState = topicCheckState(topic, topic.children);
  const completed = checkState === true;
  const nextCompleted = checkState !== true;

  return (
    <div className={cn('flex items-start gap-2 py-0.5', !isRoot && 'ps-8')}>
      {row.getCanExpand() ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={(event) => {
            event.stopPropagation();
            row.toggleExpanded();
          }}
          aria-label={
            row.getIsExpanded()
              ? t('schemeOfWork.collapseTopic')
              : t('schemeOfWork.expandTopic')
          }
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <Checkbox
        checked={checkState}
        disabled={!canMark || pending}
        onCheckedChange={() => onToggleProgress(topic, nextCompleted)}
        aria-label={title}
        className="mt-0.5 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-medium',
            completed && 'text-muted-foreground line-through',
          )}
        >
          {title}
        </p>
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
          {isRoot ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onAddSubTopic(topic.id)}
              aria-label={t('schemeOfWork.addSubTopic')}
            >
              <Plus className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={siblingIndex <= 0 || pending}
            onClick={() => onMove(siblings, topic.id, -1)}
            aria-label={t('schemeOfWork.moveUp')}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1 || pending}
            onClick={() => onMove(siblings, topic.id, 1)}
            aria-label={t('schemeOfWork.moveDown')}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(topic)}
            aria-label={t('common.buttons.edit')}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(topic.id)}
            aria-label={t('common.buttons.delete')}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
