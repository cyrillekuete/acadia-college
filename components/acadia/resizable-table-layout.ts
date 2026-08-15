import type { DataGridProps } from '@/components/ui/data-grid';

export const METRONIC_RESIZABLE_TABLE_LAYOUT: NonNullable<
  DataGridProps<object>['tableLayout']
> = {
  width: 'fixed',
  columnsResizable: true,
  columnsPinnable: true,
  columnsMovable: true,
  columnsVisibility: true,
};
