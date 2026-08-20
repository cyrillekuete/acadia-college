import { Suspense } from 'react';
import { loadAuthorizedClassBulletins } from '@/lib/acadia/load-class-bulletins';
import ClassBulletinsPdfClient from './class-bulletins-pdf-client';

async function ClassBulletinsPdfPageInner({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    academicYearId?: string;
    term?: string;
    includeWithdrawn?: string;
  }>;
}) {
  const sp = await searchParams;
  const classId = (sp.classId ?? '').trim();

  if (!classId) {
    return <ClassBulletinsPdfClient classId="" initialError="Missing classId" />;
  }

  const result = await loadAuthorizedClassBulletins({
    classId,
    academicYearId: sp.academicYearId,
    term: sp.term,
    includeWithdrawn: sp.includeWithdrawn === '1',
  });

  if (!result.ok) {
    return <ClassBulletinsPdfClient classId={classId} initialError={result.error} />;
  }

  return <ClassBulletinsPdfClient classId={classId} initialData={result.data} />;
}

export default function ClassBulletinsPdfPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    academicYearId?: string;
    term?: string;
    includeWithdrawn?: string;
  }>;
}) {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading class bulletins…</div>}>
      <ClassBulletinsPdfPageInner searchParams={searchParams} />
    </Suspense>
  );
}
