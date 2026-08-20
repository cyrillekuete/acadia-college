import type { ReactNode } from 'react';
import { PromotionAccessGate } from '@/components/acadia/admin/promotion-access-gate';

export default function DataRetentionLayout({ children }: { children: ReactNode }) {
  return <PromotionAccessGate>{children}</PromotionAccessGate>;
}
