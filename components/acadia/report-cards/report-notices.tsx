'use client';

import type { ReportCardData } from '@/lib/acadia/report-card-types';

export function ReportCardNotices({ data }: { data: ReportCardData }) {
  const incomplete = data.marksStatus?.status === 'incomplete';
  const missing = data.marksStatus?.missingSubjectCount ?? 0;
  const promotionDiffers =
    data.history.promotionStatus === 'incomplete' ||
    (data.history.promotionAvg != null &&
      data.history.annualAvg != null &&
      Math.abs(data.history.promotionAvg - data.history.annualAvg) >= 0.01);
  const signatures = data.missingSignatures ?? [];
  const transferred = data.transferredFrom;

  if (!incomplete && !promotionDiffers && signatures.length === 0 && !transferred) {
    return null;
  }

  return (
    <div className="relative z-10 mb-2 print:mb-1 space-y-1 text-[0.65rem] print:text-[8pt]">
      {incomplete ? (
        <p className="rounded border border-amber-400 bg-amber-50 px-2 py-1 text-amber-900">
          Partial average — {missing} subject{missing === 1 ? '' : 's'} missing.
          Promotion will stay pending until every offered paper is scored.
        </p>
      ) : null}
      {transferred ? (
        <p className="rounded border border-slate-300 bg-slate-50 px-2 py-1">
          Transferred from {transferred.className}
          {transferred.enrolledAt
            ? ` on ${new Date(transferred.enrolledAt).toLocaleDateString('en-GB')}`
            : ''}
          . Marks from the former class are included.
        </p>
      ) : null}
      {promotionDiffers && data.academic.term === 'annual' ? (
        <p className="rounded border border-slate-300 bg-slate-50 px-2 py-1">
          Bulletin annual avg (partial OK):{' '}
          {data.history.annualAvg != null ? data.history.annualAvg.toFixed(2) : '—'}
          . Promotion avg (complete records only):{' '}
          {data.history.promotionAvg != null
            ? data.history.promotionAvg.toFixed(2)
            : 'pending'}
          {data.history.promotionStatus === 'incomplete' ? ' — incomplete marks.' : '.'}
        </p>
      ) : null}
      {signatures.length > 0 ? (
        <p className="rounded border border-amber-400 bg-amber-50 px-2 py-1 text-amber-900">
          Signature line{signatures.length === 1 ? '' : 's'} empty:{' '}
          {signatures
            .map((item) => (item === 'classMaster' ? 'class master' : 'principal'))
            .join(', ')}
          . Print only after names are set, or override as administrator.
        </p>
      ) : null}
    </div>
  );
}
