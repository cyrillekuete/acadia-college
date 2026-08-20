'use client';

import { useMemo, useState, type ReactNode } from 'react';
import QRCode from 'react-qr-code';
import { GraduationCap, Star } from '@/lib/icons';
import { formatGceCount } from '@/lib/acadia/report-card';
import type { ReportCardData } from '@/lib/acadia/report-card-types';
import { REPORT_CARD_PDF_STYLES } from '@/components/acadia/report-cards/report-card-pdf-styles';
import {
  REPORT_CARD_THEME,
  reportCardPeriodLabel,
} from '@/components/acadia/report-cards/report-card-theme';
import { buildReportCardQrValue } from '@/lib/acadia/report-card-types';

const { navy, gold, grouping, green, red, border } = REPORT_CARD_THEME;

const TERM_NAMES: Record<number, { en: string; fr: string; ordinal: string }> = {
  1: { en: 'FIRST TERM', fr: 'Premier Trimestre', ordinal: 'FIRST' },
  2: { en: 'SECOND TERM', fr: 'Deuxième Trimestre', ordinal: 'SECOND' },
  3: { en: 'THIRD TERM', fr: 'Troisième Trimestre', ordinal: 'THIRD' },
};

export function ReportCardPdfStyleTag() {
  return (
    <style
      id="term-report-card-pdf-styles"
      dangerouslySetInnerHTML={{ __html: REPORT_CARD_PDF_STYLES }}
    />
  );
}

export function ReportCardHeader({
  data,
  mode,
}: {
  data: ReportCardData;
  mode: 'term' | 'annual';
}) {
  const [logoError, setLogoError] = useState(false);
  const branding = data.branding;
  const logoSrc = branding.logoUrl;
  const term =
    typeof data.academic.term === 'number' ? data.academic.term : 3;
  const termName = TERM_NAMES[term] ?? TERM_NAMES[3];

  const qrCodeData = useMemo(
    () =>
      buildReportCardQrValue({
        studentProfileId: data.student.id,
        matricule: data.student.studentId,
        academicYear: data.academic.year,
        term: mode === 'annual' ? 'annual' : term,
      }),
    [data.student.id, data.student.studentId, data.academic.year, mode, term],
  );

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="w-[90%] h-auto opacity-[0.06] transform -rotate-6"
            style={{ filter: 'contrast(1.5) brightness(1.5)' }}
          />
        ) : null}
      </div>

      <header
        className="grid grid-cols-1 md:grid-cols-3 md:items-stretch gap-3 print:gap-2 mb-2 print:mb-1 border-b-2 pb-2 print:pb-1 relative z-10"
        style={{ borderColor: navy }}
      >
        <div className="flex flex-col justify-center text-center md:text-left text-[10px] print:text-[8pt] uppercase font-medium leading-tight gap-1 print:gap-0.5 min-h-[6.5rem] w-full">
          <p>République du Cameroun</p>
          <p>Paix - Travail - Patrie</p>
          <p>Ministère des Enseignements Secondaires</p>
          <p>{branding.regionFr}</p>
          <p className="text-black">{branding.displayNameFr}</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 print:gap-1 min-h-[6.5rem]">
          <div className="w-24 h-24 shrink-0 relative overflow-hidden flex items-center justify-center">
            {logoError || !logoSrc ? (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-full">
                <GraduationCap className="size-6 text-gray-400" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={branding.displayNameEn}
                className="max-w-full max-h-full object-contain"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <div className="uppercase text-black text-[0.5rem] print:text-[6pt] text-center">
            {branding.contactLine}
          </div>
        </div>

        <div className="flex flex-col justify-center text-right text-[10px] print:text-[8pt] uppercase font-medium leading-tight gap-1 print:gap-0.5 min-h-[6.5rem]">
          <p>Republic of Cameroon</p>
          <p>Peace - Work - Fatherland</p>
          <p>Ministry of Secondary Education</p>
          <p>{branding.regionEn}</p>
          <p className="text-black">{branding.displayNameEn}</p>
        </div>
      </header>

      <div className="mb-0.5 print:mb-0 relative z-10">
        <div
          className="rc-navy flex flex-col md:flex-row items-center justify-between text-white p-0.5 print:p-0.5 mb-0.5"
          style={{ backgroundColor: navy }}
        >
          <span className="font-mono text-[0.5rem] print:text-[6pt] uppercase tracking-widest px-1">
            Academic Year {data.academic.year}
          </span>
          <div className="flex-1 mx-2 h-px bg-white/50 hidden md:block" />
          <span className="font-mono text-[0.5rem] print:text-[6pt] uppercase tracking-widest px-1">
            Année Scolaire {data.academic.year}
          </span>
        </div>

        <div
          className="rc-section border-2 print:border px-1.5 py-0.5 print:px-1 print:py-0 relative overflow-hidden"
          style={{ borderColor: navy }}
        >
          <div className="relative z-10 flex flex-row items-center gap-2 print:gap-1.5">
            <div className="size-10 shrink-0 opacity-80">
              <div className="bg-white p-px border" style={{ borderColor: navy }}>
                <QRCode
                  value={qrCodeData}
                  size={40}
                  style={{ width: 38, height: 38 }}
                  title={`Report card ${data.student.studentId || data.student.id}`}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              {mode === 'annual' ? (
                <>
                  <h2
                    className="font-black text-xl print:text-2xl uppercase tracking-tighter leading-none mb-0.5"
                    style={{ color: navy }}
                  >
                    ANNUAL REPORT CARD
                  </h2>
                  <div className="flex items-center gap-1 w-full justify-center">
                    <div className="h-0.5 w-6" style={{ backgroundColor: gold }} />
                    <p
                      className="text-[0.5rem] print:text-[6pt] font-bold tracking-widest uppercase whitespace-nowrap flex items-center gap-0.5"
                      style={{ color: gold }}
                    >
                      <Star className="size-2" style={{ color: gold }} /> Bulletin Annuel{' '}
                      <Star className="size-2" style={{ color: gold }} />
                    </p>
                    <div className="h-0.5 w-6" style={{ backgroundColor: gold }} />
                  </div>
                </>
              ) : (
                <>
                  <h2
                    className="font-black text-xl print:text-2xl uppercase tracking-tighter leading-none mb-0.5"
                    style={{ color: navy }}
                  >
                    {termName.ordinal} TERM
                  </h2>
                  <p
                    className="font-black text-base print:text-lg uppercase tracking-[0.2em] leading-none mb-0.5"
                    style={{ color: gold }}
                  >
                    REPORT CARD
                  </p>
                  <div className="flex items-center gap-1 w-full justify-center">
                    <div className="h-0.5 w-6" style={{ backgroundColor: gold }} />
                    <p
                      className="text-[0.5rem] print:text-[6pt] font-bold tracking-widest uppercase whitespace-nowrap flex items-center gap-0.5"
                      style={{ color: gold }}
                    >
                      <Star className="size-2" style={{ color: gold }} /> Bulletin du {termName.fr}{' '}
                      <Star className="size-2" style={{ color: gold }} />
                    </p>
                    <div className="h-0.5 w-6" style={{ backgroundColor: gold }} />
                  </div>
                </>
              )}
            </div>
            <div className="size-10 shrink-0" aria-hidden />
          </div>
        </div>
      </div>
    </>
  );
}

export function ReportCardStudentGrid({ data }: { data: ReportCardData }) {
  return (
    <div
      className="rc-student-grid border grid grid-cols-12 mb-1 print:mb-0.5 font-mono text-[0.65rem] print:text-[7pt] relative z-10 bg-white/90"
      style={{ borderColor: navy }}
    >
      <div className="col-span-4 border-b border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          First Name / Prénom
        </span>
        <span className="font-bold text-[0.7rem] print:text-[7pt]">
          {data.student.firstName || data.student.name.split(' ')[0]}
        </span>
      </div>
      <div className="col-span-4 border-b border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Last Name / Nom
        </span>
        <span className="font-bold text-[0.7rem] print:text-[7pt]">
          {data.student.lastName || data.student.name.split(' ').slice(1).join(' ')}
        </span>
      </div>
      <div className="col-span-4 border-b border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Unique Identifier No / Matricule
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">
          {data.student.studentId || '—'}
        </span>
      </div>
      <div className="col-span-2 border-b border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Sex
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">{data.student.sex}</span>
      </div>
      <div className="col-span-4 border-b border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Date of Birth / Né le
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">{data.student.dob}</span>
      </div>
      <div className="col-span-4 border-b border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Place of Birth / Né à
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">{data.student.pob}</span>
      </div>
      <div className="col-span-2 border-b border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Repeater / Redoublant
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">NO / NON</span>
      </div>
      <div className="col-span-5 border-b md:border-b-0 border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Speciality
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">
          {data.student.speciality || '—'}
        </span>
      </div>
      <div className="col-span-4 border-b md:border-b-0 border-r border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Class
        </span>
        <span className="font-bold text-[0.65rem] print:text-[7pt]">{data.student.className}</span>
      </div>
      <div className="col-span-3 border-b md:border-b-0 border-black">
        <span className="block text-[0.5rem] print:text-[6pt] text-gray-500 uppercase leading-tight">
          Master
        </span>
        <span className="font-bold text-[0.6rem] print:text-[6pt]">
          {data.student.classMaster || '-'}
        </span>
      </div>
    </div>
  );
}

function ClassPerformanceStatCell({
  value,
  label,
  color,
  lastCol,
  lastRow,
}: {
  value: string;
  label: string;
  color: string;
  lastCol?: boolean;
  lastRow?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-1 py-2 text-center"
      style={{
        borderRight: lastCol ? undefined : `1px solid ${border}`,
        borderBottom: lastRow ? undefined : `1px solid ${border}`,
      }}
    >
      <span className="text-base print:text-sm font-black font-mono leading-none" style={{ color }}>
        {value}
      </span>
      <span className="mt-1 text-[0.45rem] print:text-[5.5pt] font-semibold uppercase tracking-wide text-gray-500 leading-tight">
        {label}
      </span>
    </div>
  );
}

function ClassPerformanceStatistics({ data }: { data: ReportCardData }) {
  const period = reportCardPeriodLabel(data.academic.term);
  const rank =
    data.history.rank != null && data.history.rank > 0 ? String(data.history.rank) : '—';

  return (
    <div className="relative z-10 mb-2 print:mb-1">
      <div
        className="rc-grouping px-2 py-1 print:py-0.5 text-center text-[10px] print:text-[8pt] font-bold uppercase tracking-wide"
        style={{ backgroundColor: grouping, color: navy }}
      >
        Class Performance Statistics — {data.student.className}, {period}
      </div>
      <div
        className="grid grid-cols-4 bg-white"
        style={{ border: `1px solid ${border}`, borderTop: 'none' }}
      >
        <ClassPerformanceStatCell
          value={String(data.stats.classSize)}
          label="Class Enrollment"
          color={navy}
        />
        <ClassPerformanceStatCell
          value={data.stats.classAvg.toFixed(2)}
          label="Class Average"
          color={navy}
        />
        <ClassPerformanceStatCell
          value={String(data.stats.passed)}
          label="Number Passed"
          color={green}
        />
        <ClassPerformanceStatCell
          value={String(data.stats.failed)}
          label="Number Failed"
          color={red}
          lastCol
        />
        <ClassPerformanceStatCell
          value={String(data.discipline.absences)}
          label="Number of Absences"
          color={navy}
          lastRow
        />
        <ClassPerformanceStatCell
          value={`${data.stats.passPercent.toFixed(0)}%`}
          label="Percentage Passed (of sat)"
          color={green}
          lastRow
        />
        <ClassPerformanceStatCell
          value={`${data.stats.failPercent.toFixed(0)}%`}
          label="Percentage Failed"
          color={red}
          lastRow
        />
        <ClassPerformanceStatCell
          value={rank}
          label="Student's Rank in Class"
          color={navy}
          lastCol
          lastRow
        />
      </div>
      <p className="text-[0.55rem] print:text-[7pt] italic px-1 pt-1">
        Academic pass is ≥ 10/20 among evaluated students
        {data.stats.evaluated != null
          ? ` (${data.stats.passed}/${data.stats.evaluated} sat`
          : ''}
        {data.stats.passPercentOfClass != null
          ? `; ${data.stats.passed}/${data.stats.classSize} of class = ${data.stats.passPercentOfClass.toFixed(0)}%`
          : ''}
        {data.stats.evaluated != null ? ')' : ''}. Promotion uses the class threshold.
      </p>
    </div>
  );
}

export function ReportCardFooter({
  data,
  evaluation,
}: {
  data: ReportCardData;
  evaluation: ReactNode;
}) {
  const gce = {
    tradeSubjects: data.stats.gceTradeSubjects ?? 0,
    relatedTrade: data.stats.gceRelatedTrade ?? 0,
    otherSubjects:
      (data.stats.gceLanguageSubjects ?? 0) + (data.stats.gceOtherSubjects ?? 0),
    passed: data.stats.gceSubjectsPassed ?? 0,
  };

  return (
    <>
      <div className="grid grid-cols-3 print:grid-cols-3 gap-2 print:gap-1 mb-2 print:mb-1 relative z-10 items-stretch">
        {evaluation}
        <div
          className="rc-section border bg-white/90 h-full flex flex-col"
          style={{ borderColor: navy }}
        >
          <div
            className="rc-navy p-0.5 print:p-0.5 text-left text-[10px] print:text-[8pt] font-bold uppercase border-b text-white"
            style={{ backgroundColor: navy, borderColor: navy }}
          >
            Discipline & Conduct
          </div>
          <div className="text-[11px] print:text-[8pt] p-1.5 print:p-1 space-y-1 flex-1">
            <div
              className="flex justify-between pb-0.5"
              style={{ borderBottom: `1px solid ${border}` }}
            >
              <span>Unjustified Absences</span>
              <span className="font-mono font-bold">{data.discipline.absences}hrs</span>
            </div>
            <div className="flex justify-between">
              <span>Suspensions / Warnings</span>
              <span className="font-mono font-bold">
                {data.discipline.suspensions + data.discipline.warnings}
              </span>
            </div>
          </div>
        </div>
        <div
          className="rc-section border bg-white/90 h-full flex flex-col"
          style={{ borderColor: navy }}
        >
          <div
            className="rc-navy border-b p-1 print:p-0.5"
            style={{ backgroundColor: navy, borderColor: navy }}
          >
            <h4 className="font-bold text-[11px] print:text-[8pt] text-left uppercase text-white">
              GCE SECTION
            </h4>
          </div>
          <div className="space-y-0.5 font-mono text-[11px] print:text-[8pt] p-1.5 print:p-1 flex-1">
            <div className="flex justify-between">
              <span>Trade Subjects:</span> <span>{formatGceCount(gce.tradeSubjects)}</span>
            </div>
            <div className="flex justify-between">
              <span>Related Trade:</span> <span>{formatGceCount(gce.relatedTrade)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Subjects:</span> <span>{formatGceCount(gce.otherSubjects)}</span>
            </div>
            <div
              className="flex justify-between font-bold pt-1 mt-1"
              style={{ borderTop: `1px solid ${border}` }}
            >
              <span>GCE SUBJECTS PASSED:</span> <span>{formatGceCount(gce.passed)}</span>
            </div>
          </div>
        </div>
      </div>

      <ClassPerformanceStatistics data={data} />

      <div className="flex justify-center items-start gap-2 print:gap-1 mt-auto mb-2 print:mb-3 relative z-10 w-full">
        <div
          className="rc-section border p-1.5 print:p-1 text-[0.6rem] print:text-[7pt] flex flex-col justify-between bg-white/90 flex-1"
          style={{ height: '60px', borderColor: navy }}
        >
          <h4 className="font-bold text-left underline" style={{ color: navy }}>
            The Class Master
          </h4>
          <div className="text-left text-sm print:text-xs opacity-70">
            {data.student.classMaster || (
              <span className="italic text-amber-700">Name not set</span>
            )}
          </div>
          <div className="text-[0.5rem] print:text-[6pt] text-left text-gray-400 mt-0.5 italic">
            Signature
          </div>
        </div>
        <div
          className="rc-section border p-1.5 print:p-1 text-[0.6rem] print:text-[7pt] flex flex-col justify-between bg-white/90 flex-1"
          style={{ height: '60px', borderColor: navy }}
        >
          <h4 className="font-bold text-left underline" style={{ color: navy }}>
            The Principal
          </h4>
          <div className="text-left text-sm print:text-xs opacity-70">
            {data.branding.principalName || (
              <span className="italic text-amber-700">Name not set</span>
            )}
          </div>
          <div className="text-[0.5rem] print:text-[6pt] text-left text-gray-400 mt-0.5 italic">
            Stamp & Signature
          </div>
        </div>
      </div>
    </>
  );
}

export function ReportCardSheet({
  variant,
  children,
  className,
}: {
  variant: 'default' | 'pdfRender';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        variant === 'pdfRender'
          ? 'min-h-0 bg-white p-0 font-sans text-gray-900'
          : 'min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-900 print:p-0'
      }
    >
      <div
        className={`pdf-report-card max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:w-full print:max-w-full text-[13px] print:text-[9pt] relative isolate overflow-hidden ${
          variant === 'pdfRender'
            ? 'shadow-none print:min-h-[297mm] print:h-auto print:overflow-visible'
            : 'print:h-auto print:min-h-0 print:overflow-visible'
        } ${className ?? ''}`}
      >
        <div
          className="px-8 print:px-3 pt-0 print:pt-6 pb-8 print:pb-8 flex flex-col gap-0 relative min-h-[297mm]"
          style={{ color: 'rgba(26, 26, 26, 1)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
