import type { DataGridProps } from '@/components/ui/data-grid';

export const SUBJECTS_TABLE_LAYOUT: NonNullable<
  DataGridProps<object>['tableLayout']
> = {
  width: 'fixed',
  columnsResizable: true,
  columnsPinnable: true,
  columnsMovable: true,
  columnsVisibility: true,
};
