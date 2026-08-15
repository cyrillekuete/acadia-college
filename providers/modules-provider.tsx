import { ReactNode } from 'react';

/**
 * Kept as a layout seam. Demo commerce sheets used to wrap every page here;
 * those routes are redirected away, so this is a passthrough.
 */
export function ModulesProvider({ children }: { children: ReactNode }) {
  return children;
}
