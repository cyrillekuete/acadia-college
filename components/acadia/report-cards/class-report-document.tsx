'use client';

import { useState } from 'react';
import { GraduationCap } from '@/lib/icons';
import { formatMarkScore, isPassingScore } from '@/lib/acadia/assessment';
import type {
  ClassReportData,
  ClassReportRankedStudent,
} from '@/lib/acadia/class-report';
import {
  ReportCardPdfStyleTag,
  ReportCardSheet,
} from '@/components/acadia/report-cards/report-card-chrome';

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('en-GB');
}

function StudentLines({ students }: { students: ClassReportRankedStudent[] }) {
  if (students.length === 0) {
    return <span>—</span>;
  }
  return (
    <span>
      {students.map((student, index) => (
        <span key={student.studentProfileId}>
          {index > 0 ? '; ' : ''}
          {student.name}
          {student.matricule ? ` (${student.matricule})` : ''}
          {` — ${formatMarkScore(student.average)} / 20`}
        </span>
      ))}
    </span>
  );
}

function RankTable({
  rows,
  emptyLabel,
}: {
  rows: ClassReportRankedStudent[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[0.65rem] print:text-[8pt] italic">{emptyLabel}</p>;
  }

  return (
    <table className="text-[0.65rem] print:text-[8pt]">
      <thead>
        <tr className="bg-gray-200 font-semibold uppercase">
          <th className="w-[12%] text-center">Rank</th>
          <th className="w-[38%] text-left">Name</th>
          <th className="w-[22%] text-left">Matricule</th>
          <th className="w-[14%] text-center">Average</th>
          <th className="w-[14%] text-center">Result</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.studentProfileId}>
            <td className="text-center">{row.rank}</td>
            <td>{row.name}</td>
            <td>{row.matricule || '—'}</td>
            <td className="text-center">{formatMarkScore(row.average)}</td>
            <td
              className={`text-center font-semibold ${
                isPassingScore(row.average) ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {row.passed ? 'Pass' : 'Fail'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ClassReportDocument({
  data,
  variant = 'default',
}: {
  data: ClassReportData;
  variant?: 'default' | 'pdfRender';
}) {
  const [logoError, setLogoError] = useState(false);
  const branding = data.branding;
  const logoSrc = branding.logoUrl;
  const stats = data.stats;

  return (
    <ReportCardSheet variant={variant} className="!overflow-visible h-auto min-h-[297mm]">
      <ReportCardPdfStyleTag />
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

      <header className="grid grid-cols-1 md:grid-cols-3 md:items-stretch gap-3 print:gap-2 mb-2 print:mb-1 border-b-2 border-black pb-2 print:pb-1 relative z-10">
        <div className="flex flex-col justify-center text-center md:text-left text-[0.55rem] print:text-[7pt] uppercase font-medium leading-tight gap-1 print:gap-0.5 min-h-[6.5rem] w-full">
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
        <div className="flex flex-col justify-center text-right text-[0.55rem] print:text-[7pt] uppercase font-medium leading-tight gap-1 print:gap-0.5 min-h-[6.5rem]">
          <p>Republic of Cameroon</p>
          <p>Peace - Work - Fatherland</p>
          <p>Ministry of Secondary Education</p>
          <p>{branding.regionEn}</p>
          <p className="text-black">{branding.displayNameEn}</p>
        </div>
      </header>

      <div className="relative z-10 space-y-3 print:space-y-2 pb-4">
        <div className="flex flex-col md:flex-row items-center justify-between bg-black text-white p-0.5">
          <span className="font-mono text-[0.5rem] print:text-[6pt] uppercase tracking-widest px-1">
            Academic Year {data.academicYearLabel}
          </span>
          <div className="flex-1 mx-2 h-px bg-white/50 hidden md:block" />
          <span className="font-mono text-[0.5rem] print:text-[6pt] uppercase tracking-widest px-1">
            Année Scolaire {data.academicYearLabel}
          </span>
        </div>

        <div className="border-2 print:border border-black text-center py-1.5 print:py-1">
          <h1 className="text-sm print:text-[11pt] font-bold uppercase tracking-wide">
            Class report / Rapport de classe
          </h1>
          <p className="text-[0.65rem] print:text-[8pt] uppercase">
            {data.periodLabelEn} / {data.periodLabelFr}
          </p>
        </div>

        <table className="text-[0.65rem] print:text-[8pt]">
          <tbody>
            <tr>
              <td className="w-[22%] bg-gray-100 font-semibold">Class</td>
              <td className="w-[28%]">{data.className}</td>
              <td className="w-[22%] bg-gray-100 font-semibold">Class master</td>
              <td className="w-[28%]">{data.classMaster || '—'}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-semibold">Generated</td>
              <td colSpan={3}>{formatWhen(data.generatedAt)}</td>
            </tr>
          </tbody>
        </table>

        <table className="text-[0.65rem] print:text-[8pt] text-center">
          <thead>
            <tr className="bg-gray-200 font-semibold uppercase">
              <th>Enrolled</th>
              <th>Evaluated</th>
              <th>Class avg</th>
              <th>Highest</th>
              <th>Lowest</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{stats.classSize}</td>
              <td>{stats.evaluated}</td>
              <td>{formatMarkScore(stats.classAvg)}</td>
              <td>{formatMarkScore(stats.maxAvg)}</td>
              <td>{formatMarkScore(stats.minAvg)}</td>
            </tr>
          </tbody>
        </table>

        <table className="text-[0.65rem] print:text-[8pt] text-center">
          <thead>
            <tr className="bg-gray-200 font-semibold uppercase">
              <th>Passed</th>
              <th>Pass %</th>
              <th>Failed</th>
              <th>Fail %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-green-700 font-semibold">{stats.passed}</td>
              <td className="text-green-700 font-semibold">
                {formatPercent(stats.passPercent)}
              </td>
              <td className="text-red-600 font-semibold">{stats.failed}</td>
              <td className="text-red-600 font-semibold">
                {formatPercent(stats.failPercent)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="text-[0.65rem] print:text-[8pt]">
          <tbody>
            <tr>
              <td className="w-[22%] bg-gray-100 font-semibold">Best student(s)</td>
              <td>
                <StudentLines students={data.best} />
              </td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-semibold">Worst student(s)</td>
              <td>
                <StudentLines students={data.worst} />
              </td>
            </tr>
          </tbody>
        </table>

        <section>
          <h2 className="text-[0.7rem] print:text-[9pt] font-bold uppercase border-b border-black mb-1">
            Top {data.topN}
          </h2>
          <RankTable rows={data.top} emptyLabel="No evaluated students." />
        </section>

        <section>
          <h2 className="text-[0.7rem] print:text-[9pt] font-bold uppercase border-b border-black mb-1">
            Bottom {data.topN}
          </h2>
          <RankTable rows={data.bottom} emptyLabel="No evaluated students." />
        </section>

        <section>
          <h2 className="text-[0.7rem] print:text-[9pt] font-bold uppercase border-b border-black mb-1">
            Full class ranking
          </h2>
          <RankTable rows={data.ranked} emptyLabel="No evaluated students." />
        </section>

        {data.unevaluated.length > 0 ? (
          <section>
            <h2 className="text-[0.7rem] print:text-[9pt] font-bold uppercase border-b border-black mb-1">
              Unevaluated ({data.unevaluated.length})
            </h2>
            <p className="text-[0.65rem] print:text-[8pt]">
              {data.unevaluated
                .map((student) =>
                  student.matricule
                    ? `${student.name} (${student.matricule})`
                    : student.name,
                )
                .join('; ')}
            </p>
          </section>
        ) : null}
      </div>
    </ReportCardSheet>
  );
}
