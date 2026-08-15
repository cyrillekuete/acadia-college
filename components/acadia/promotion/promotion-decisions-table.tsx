'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ACADEMIC_STRUCTURE_TABLE_LAYOUT } from '@/components/acadia/academics/academic-structure-table-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatMarkScore } from '@/lib/acadia/assessment';
import { levelDisplayLabel } from '@/lib/acadia/education-system';
import { promotionActionLabel } from '@/lib/acadia/promotion';
import { unwrapRelation } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

export type PromotionDecisionRow = {
  id: string | null;
  studentProfileId: string;
  yearAverage: unknown;
  recommendedAction: unknown;
  finalAction: unknown;
  source: unknown;
  targetLevelId: string | null;
  policyMinAverage: unknown;
  policyStaleAt: unknown;
  isPending: boolean;
  classChangedSinceCompute: boolean;
  StudentProfile?: unknown;
  Level?: unknown;
};

export type PromotionOverrideTarget = {
  studentProfileId: string;
  registrationNumber: string;
  finalAction: string;
  targetLevelId: string | null;
  classId: string;
};

export function PromotionDecisionsTable({
  rows,
  yearLocked,
  classId,
  onOverride,
}: {
  rows: PromotionDecisionRow[];
  yearLocked: boolean;
  classId: string;
  onOverride: (target: PromotionOverrideTarget) => void;
}) {
  const { t } = useTranslation();
  const [columnOrder, setColumnOrder] = useState([
    'student',
    'yearAvg',
    'threshold',
    'recommended',
    'final',
    'targetLevel',
    'actions',
  ]);

  const columns = useMemo<ColumnDef<PromotionDecisionRow>[]>(
    () => [
      {
        id: 'student',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('students.student')} visibility column={column} />
        ),
        cell: ({ row }) => {
          const profile = unwrapRelation<{
            registrationNumber?: string;
            User?: unknown;
          }>(row.original.StudentProfile);
          const user = unwrapRelation<{ name?: string }>(profile?.User);
          return (
            <Link
              href={`/students/${row.original.studentProfileId}`}
              className="font-medium text-primary hover:underline"
            >
              {user?.name ?? profile?.registrationNumber ?? '—'}
            </Link>
          );
        },
        size: 200,
      },
      {
        id: 'yearAvg',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('academics.yearAvg')} visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.isPending
            ? '—'
            : formatMarkScore(
                row.original.yearAverage != null
                  ? Number(row.original.yearAverage)
                  : null,
              ),
        size: 100,
      },
      {
        id: 'threshold',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('academics.threshold')} visibility column={column} />
        ),
        cell: ({ row }) =>
          row.original.policyMinAverage != null
            ? formatMarkScore(Number(row.original.policyMinAverage))
            : '—',
        size: 110,
      },
      {
        id: 'recommended',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('academics.recommended')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.isPending
            ? t('academics.pending')
            : t(`academics.action.${row.original.recommendedAction}`, {
                defaultValue: promotionActionLabel(
                  row.original.recommendedAction as Parameters<
                    typeof promotionActionLabel
                  >[0],
                ),
              }),
        size: 140,
      },
      {
        id: 'final',
        header: ({ column }) => (
          <DataGridColumnHeader title={t('academics.final')} visibility column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            {row.original.isPending ? (
              <Badge variant="outline">{t('academics.pending')}</Badge>
            ) : (
              <Badge variant={row.original.source === 'MANUAL' ? 'primary' : 'secondary'}>
                {t(`academics.action.${row.original.finalAction}`, {
                  defaultValue: promotionActionLabel(
                    row.original.finalAction as Parameters<
                      typeof promotionActionLabel
                    >[0],
                  ),
                })}
              </Badge>
            )}
            {row.original.classChangedSinceCompute ? (
              <Badge variant="outline">{t('academics.classChanged')}</Badge>
            ) : null}
            {row.original.policyStaleAt ? (
              <Badge variant="outline">{t('academics.recompute')}</Badge>
            ) : null}
          </div>
        ),
        size: 180,
      },
      {
        id: 'targetLevel',
        header: ({ column }) => (
          <DataGridColumnHeader
            title={t('academics.targetLevel')}
            visibility
            column={column}
          />
        ),
        cell: ({ row }) => {
          const targetLevel = unwrapRelation<{
            number?: number;
            labelEn?: string;
            labelFr?: string;
          }>(row.original.Level);
          if (targetLevel) {
            return levelDisplayLabel(targetLevel);
          }
          return row.original.finalAction === 'GRADUATE'
            ? t('academics.alumni')
            : '—';
        },
        size: 140,
      },
      {
        id: 'actions',
        header: () => (
          <span className="sr-only">{t('common.labels.actions')}</span>
        ),
        cell: ({ row }) => {
          const profile = unwrapRelation<{
            registrationNumber?: string;
          }>(row.original.StudentProfile);
          return (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={yearLocked}
                onClick={() =>
                  onOverride({
                    studentProfileId: row.original.studentProfileId,
                    registrationNumber:
                      profile?.registrationNumber ?? t('students.student'),
                    finalAction: (row.original.finalAction as string) ?? 'REPEAT',
                    targetLevelId: row.original.targetLevelId,
                    classId,
                  })
                }
              >
                {t('academics.override')}
              </Button>
            </div>
          );
        },
        size: 110,
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [classId, onOverride, t, yearLocked],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id ?? `pending-${row.studentProfileId}`,
    state: { columnOrder },
    columnResizeMode: 'onChange',
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      tableLayout={ACADEMIC_STRUCTURE_TABLE_LAYOUT}
    >
      <Card>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination sizes={[10, 25, 50]} />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
