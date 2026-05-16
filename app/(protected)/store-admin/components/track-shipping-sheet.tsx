'use client';

import { ReactNode } from 'react';

type SheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  [key: string]: unknown;
};

export function StoreAdminTrackShippingSheet(_props: SheetProps) {
  return null;
}

export default StoreAdminTrackShippingSheet;
