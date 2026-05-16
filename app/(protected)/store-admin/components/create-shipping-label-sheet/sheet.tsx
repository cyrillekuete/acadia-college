'use client';

import { ReactNode } from 'react';

type SheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  [key: string]: unknown;
};

export function StoreAdminCreateShippingLabelSheet(_props: SheetProps) {
  return null;
}

export default StoreAdminCreateShippingLabelSheet;
