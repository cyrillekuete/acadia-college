'use client';

import type { ReactNode } from 'react';
import { ReportsAccessGate } from '@/components/acadia/report-cards/reports-access-gate';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canViewTranscripts } from '@/lib/acadia/transcripts';

export default function TranscriptsLayout({ children }: { children: ReactNode }) {
  const { data: session } = useAcadiaCollegeSession();

  return (
    <ReportsAccessGate allowed={canViewTranscripts(session?.roleSlug)}>
      {children}
    </ReportsAccessGate>
  );
}
