'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import {
  formatRecordValue,
  unwrapRelation,
} from '@/lib/acadia/record-display';

export function nestedFieldColumn<T extends Record<string, unknown>>(
  id: string,
  header: string,
  relationKey: keyof T & string,
  field: string,
): ColumnDef<T> {
  return {
    id,
    header,
    cell: ({ row }) => {
      const rel = unwrapRelation<Record<string, unknown>>(
        row.original[relationKey],
      );
      if (!rel) {
        return '—';
      }
      return formatRecordValue(rel[field]);
    },
  };
}

export function detailLinkColumn<T extends { id: string }>(
  hrefPrefix: string,
  labelKey: keyof T & string,
  header: string,
): ColumnDef<T> {
  return {
    accessorKey: labelKey,
    header,
    cell: ({ row }) => {
      const label = row.getValue(labelKey);
      const display =
        label !== null && label !== undefined && String(label).trim() !== ''
          ? String(label)
          : row.original.id;
      return (
        <Link
          href={`${hrefPrefix}/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {display}
        </Link>
      );
    },
  };
}
