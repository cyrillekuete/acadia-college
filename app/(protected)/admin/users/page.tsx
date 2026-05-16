'use client';

import { ScreenLoader } from '@/components/common/screen-loader';
import { useOnceRedirect } from '@/hooks/use-once-redirect';

export default function Page() {
  useOnceRedirect('/user-management/users');
  return <ScreenLoader />;
}
