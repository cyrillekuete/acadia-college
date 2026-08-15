import type { DataGridProps } from '@/components/ui/data-grid';

export const COURSEWORK_TABLE_LAYOUT: NonNullable<
  DataGridProps<object>['tableLayout']
> = {
  width: 'fixed',
  columnsResizable: true,
  columnsPinnable: true,
  columnsMovable: true,
  columnsVisibility: true,
};
