'use client';

import Link from 'next/link';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { LearningMaterialsLibraryPanel } from '@/components/acadia/resources/learning-materials-library-panel';
import { Button } from '@/components/ui/button';

export default function LearningMaterialsPage() {
  return (
    <AcadiaPageShell
      title="Learning materials library"
      description="Central repository of documents, videos, and links (FR-8.1.1)."
    >
      <div className="mb-4 print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link href="/resources">Back to resources</Link>
        </Button>
      </div>
      <LearningMaterialsLibraryPanel />
    </AcadiaPageShell>
  );
}
