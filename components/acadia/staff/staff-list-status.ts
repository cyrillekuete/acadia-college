type StatusBadgeVariant = 'success' | 'secondary';

export const StaffActiveStatusProps: Record<
  'active' | 'inactive',
  { label: string; variant: StatusBadgeVariant }
> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
};

export function getStaffActiveStatusProps(isActive: boolean) {
  return isActive
    ? StaffActiveStatusProps.active
    : StaffActiveStatusProps.inactive;
}
