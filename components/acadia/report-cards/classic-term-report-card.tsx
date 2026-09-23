'use client';

import { Fragment, useMemo, useState } from 'react';
import { groupSubjectsForReportCard } from '@/lib/acadia/report-card';
import {
  classicTermGroupRollup,
  classicTermSubjectCells,
  disciplineAbsenceTotal,
  formatClassicAverage,
  subjectSequenceMark,
} from '@/lib/acadia/classic-term-bulletin';
import {
  DEFAULT_MINISTRY_NAME_EN,
  type ReportCardBranding,
  type ReportCardData,
  type SubjectGrade,
} from '@/lib/acadia/report-card-types';
import { classicTermFontVariables } from '@/components/acadia/report-cards/classic-term-fonts';
import {
  ReportCardPdfStyleTag,
  ReportCardSheet,
} from '@/components/acadia/report-cards/report-card-chrome';

const PRIMARY_DARK = '#4AAAB5';
const PRIMARY_LIGHT = '#8CCED4';
const BORDER = '#DEDEDE';
const INK = '#1a1a1a';
const LABEL_GRAY = '#9CA3AF';
const REMARKS_GREEN = '#2D8A4E';

const TERM_COPY: Record<number, { title: string; bulletin: string }> = {
  1: { title: 'FIRST TERM', bulletin: 'BULLETIN DU PREMIER TRIMESTRE' },
  2: { title: 'SECOND TERM', bulletin: 'BULLETIN DU DEUXIÈME TRIMESTRE' },
  3: { title: 'THIRD TERM', bulletin: 'BULLETIN DU TROISIÈME TRIMESTRE' },
};

const CLASSIC_TERM_STYLES = `
.pdf-report-card.classic-term-sheet {
  --classic-sans: var(--font-classic-inter), var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --classic-display: var(--font-geist-sans), var(--font-classic-inter), ui-sans-serif, system-ui, sans-serif;
  --classic-mono: var(--font-classic-mono), ui-monospace, monospace;
  font-family: var(--classic-sans) !important;
  color: ${INK} !important;
}
.pdf-report-card.classic-term-sheet table.classic-term-grid {
  border-collapse: collapse !important;
  width: 100% !important;
  table-layout: fixed !important;
}
.pdf-report-card.classic-term-sheet table.classic-term-grid td,
.pdf-report-card.classic-term-sheet table.classic-term-grid th {
  border: 1px solid ${BORDER} !important;
  padding: 6px 4px !important;
  vertical-align: middle !important;
  background: #fff !important;
  color: ${INK} !important;
  line-height: 1.15 !important;
}
.pdf-report-card.classic-term-sheet .classic-term-body {
  position: relative;
  z-index: 1;
  flex: 1 1 auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px;
  width: 100%;
  min-height: 100%;
}
.pdf-report-card.classic-term-sheet .classic-term-subjects-wrap {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}
.pdf-report-card.classic-term-sheet table.classic-term-subjects {
  flex: 1 1 auto;
  height: 100%;
}
.pdf-report-card.classic-term-sheet table.classic-term-subjects tbody {
  height: 100%;
}
.pdf-report-card.classic-term-sheet table.classic-term-subjects tr {
  height: 1px;
}
.pdf-report-card.classic-term-sheet table.classic-term-grid tr.classic-term-fill td,
.pdf-report-card.classic-term-sheet table.classic-term-grid tr.classic-term-fill th {
  background: ${PRIMARY_DARK} !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-family: var(--classic-display) !important;
}
.pdf-report-card.classic-term-sheet table.classic-term-grid tr.classic-term-summary td,
.pdf-report-card.classic-term-sheet table.classic-term-grid tr.classic-term-summary th {
  background: ${PRIMARY_LIGHT} !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-family: var(--classic-display) !important;
}
.pdf-report-card.classic-term-sheet .classic-mono {
  font-family: var(--classic-mono) !important;
}
.pdf-report-card.classic-term-sheet .classic-display {
  font-family: var(--classic-display) !important;
}
.pdf-report-card.classic-term-sheet .classic-label {
  font-family: var(--classic-sans) !important;
  font-size: 7px !important;
  font-weight: 500 !important;
  font-style: italic !important;
  color: ${LABEL_GRAY} !important;
  letter-spacing: 0.02em !important;
}
.pdf-report-card.classic-term-sheet .classic-value {
  font-family: var(--classic-display) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: ${INK} !important;
  margin-top: 1px !important;
}
.pdf-report-card.classic-term-sheet .classic-remarks {
  font-family: var(--classic-sans) !important;
  font-size: 8px !important;
  font-style: italic !important;
  font-weight: 600 !important;
  color: ${REMARKS_GREEN} !important;
  text-transform: uppercase !important;
}
.pdf-report-card.classic-term-sheet .classic-accent {
  color: ${PRIMARY_LIGHT} !important;
  font-weight: 700 !important;
}
`;

function ministryBlocks(branding: ReportCardBranding): { institutional: string[]; school: string[] } {
  const institutional = [
    (branding.ministryEn?.trim() || DEFAULT_MINISTRY_NAME_EN).toUpperCase(),
  ];
  const customRegion = branding.regionalDelegationEn?.trim();
  if (customRegion) {
    institutional.push(customRegion.toUpperCase());
  } else {
    const region = branding.regionName?.trim();
    if (region) {
      institutional.push(`${region.toUpperCase()} REGIONAL DELEGATION`);
    }
  }
  const division = branding.divisionalDelegation?.trim();
  if (division) {
    institutional.push(
      /delegation/i.test(division)
        ? division.toUpperCase()
        : `${division.toUpperCase()} DIVISIONAL DELEGATION`,
    );
  }
  const school = [branding.displayNameEn.trim().toUpperCase() || 'SCHOOL'];
  const poBox = branding.poBox?.trim();
  if (poBox) {
    school.push(poBox.toUpperCase());
  }
  const address = branding.addressLine?.trim();
  if (address) {
    school.push(address.toUpperCase());
  }
  const phone = branding.phone?.trim();
  if (phone) {
    school.push(phone);
  }
  return { institutional, school };
}

function HeaderColumn({ branding }: { branding: ReportCardBranding }) {
  const { institutional, school } = ministryBlocks(branding);
  return (
    <div
      className="classic-display"
      style={{
        textAlign: 'center',
        fontSize: '8px',
        lineHeight: 1.2,
        fontWeight: 650,
        letterSpacing: '0.02em',
        color: INK,
      }}
    >
      {institutional.map((line) => (
        <Fragment key={line}>
          <div>{line}</div>
          <div style={{ letterSpacing: '0.2em', fontSize: '7px' }}>********</div>
        </Fragment>
      ))}
      {school.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

function formatSex(sex: string): string {
  const normalized = sex.trim().toLowerCase();
  if (normalized === 'f' || normalized === 'female') return 'FEMALE';
  if (normalized === 'm' || normalized === 'male') return 'MALE';
  return sex.trim().toUpperCase() || '-';
}

function formatDob(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '-';
  return trimmed.replace(/\//g, '-');
}

function formatRank(rank: number | undefined): string {
  if (rank == null || rank <= 0) return '-';
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return `${Math.round(value)}%`;
}

function subjectCoefficient(subject: SubjectGrade): number {
  const planned = subject.plannedCoefficient ?? subject.coefficient;
  return planned > 0 ? planned : 0;
}

function IdentityCell({
  label,
  value,
  colSpan,
  mono,
}: {
  label: string;
  value: string;
  colSpan?: number;
  mono?: boolean;
}) {
  return (
    <td colSpan={colSpan} style={{ textAlign: 'center' }}>
      <div className="classic-label">{label}</div>
      <div className={mono ? 'classic-value classic-mono' : 'classic-value'}>{value || '-'}</div>
    </td>
  );
}

function FooterMetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <tr>
      <td style={{ textAlign: 'left', fontSize: '8px', fontWeight: 700 }}>{label}</td>
      <td
        className={accent ? 'classic-mono classic-accent' : 'classic-mono'}
        style={{ textAlign: 'center', fontWeight: 700, fontSize: '11px' }}
      >
        {value}
      </td>
    </tr>
  );
}

export function ClassicTermReportCard({
  data,
  variant = 'default',
}: {
  data: ReportCardData;
  variant?: 'default' | 'pdfRender';
}) {
  const [logoError, setLogoError] = useState(false);
  const logoSrc = data.branding.reportCardLogoUrl?.trim() || '';
  const showLogo = Boolean(logoSrc) && !logoError;
  const termNumber = typeof data.academic.term === 'number' ? data.academic.term : 1;
  const copy = TERM_COPY[termNumber] ?? {
    title: `TERM ${termNumber}`,
    bulletin: 'BULLETIN',
  };
  const slots = data.sequenceSlots?.length ? data.sequenceSlots : [1, 2];
  const groupedSubjects = useMemo(
    () => groupSubjectsForReportCard(data.subjects),
    [data.subjects],
  );

  const subjectRows = useMemo(
    () =>
      data.subjects.map((subject) => {
        const cells = classicTermSubjectCells(slots.map((slot) => subjectSequenceMark(subject, slot)));
        return {
          subject,
          coefficient: subjectCoefficient(subject),
          ...cells,
        };
      }),
    [data.subjects, slots],
  );
  const grand = classicTermGroupRollup(subjectRows);
  const justified = data.discipline.justifiedAbsences ?? 0;
  const unjustified = data.discipline.absences;
  const totalAbsences = disciplineAbsenceTotal(data.discipline);
  const classAvg = Number.isFinite(data.stats.classAvg) ? data.stats.classAvg.toFixed(1) : '-';

  return (
    <>
      <ReportCardPdfStyleTag />
      <style dangerouslySetInnerHTML={{ __html: CLASSIC_TERM_STYLES }} />
      <ReportCardSheet
        variant={variant}
        className={`classic-term-sheet ${classicTermFontVariables}`}
      >
        {showLogo ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt=""
              style={{ width: '68%', height: 'auto', opacity: 0.07, objectFit: 'contain' }}
            />
          </div>
        ) : null}

        <div className="classic-term-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 108px 1fr',
              alignItems: 'center',
              gap: 8,
              marginTop: 16,
            }}
          >
            <HeaderColumn branding={data.branding} />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {showLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt={data.branding.displayNameEn}
                  onError={() => setLogoError(true)}
                  style={{ width: 92, height: 92, objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: '50%',
                    border: `1.5px dashed ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 8,
                    color: LABEL_GRAY,
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    lineHeight: 1.2,
                  }}
                >
                  SCHOOL LOGO
                </div>
              )}
            </div>
            <HeaderColumn branding={data.branding} />
          </div>

          <div>
            <div style={{ height: 1.5, background: PRIMARY_DARK, width: '100%' }} />
            <div
              className="classic-mono"
              style={{
                background: PRIMARY_DARK,
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 10px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                gap: 12,
              }}
            >
              <span style={{ flex: '0 1 auto', whiteSpace: 'nowrap' }}>
                ACADEMIC YEAR {data.academic.year}
              </span>
              <span
                style={{
                  flex: '1 1 auto',
                  height: 1,
                  background: '#ffffff',
                  minWidth: 24,
                  alignSelf: 'center',
                }}
              />
              <span style={{ flex: '0 1 auto', whiteSpace: 'nowrap' }}>
                ANNÉE UNIVERSITAIRE {data.academic.year}
              </span>
            </div>
          </div>

          <div className="classic-display" style={{ textAlign: 'center', color: INK, padding: '2px 0 4px' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1 }}>
              {copy.title}
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '0.28em',
                marginTop: 2,
                lineHeight: 1.1,
              }}
            >
              REPORT CARD
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
                color: PRIMARY_DARK,
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              <span style={{ flex: '0 0 42px', height: 2, background: PRIMARY_DARK }} />
              <span>* {copy.bulletin} *</span>
              <span style={{ flex: '0 0 42px', height: 2, background: PRIMARY_DARK }} />
            </div>
          </div>

          <table className="classic-term-grid">
            <tbody>
              <tr>
                <IdentityCell label="FIRST NAME/PRÉNOM" value={data.student.firstName || '-'} colSpan={2} />
                <IdentityCell label="LAST NAME/NOM" value={data.student.lastName || '-'} colSpan={2} />
                <IdentityCell
                  label="MATRICULE"
                  value={data.student.studentId || '-'}
                  colSpan={2}
                  mono
                />
              </tr>
              <tr>
                <IdentityCell label="SEX" value={formatSex(data.student.sex)} />
                <IdentityCell label="DATE OF BIRTH/ NÉ LE" value={formatDob(data.student.dob)} colSpan={2} />
                <IdentityCell label="PLACE OF BIRTH/NÉ À" value={formatDob(data.student.pob)} colSpan={2} />
                <IdentityCell
                  label="REPEATER/REDOUBLANT"
                  value={data.student.isRepeater ? 'YES/OUI' : 'NO/NON'}
                />
              </tr>
              <tr>
                <IdentityCell label="SPECIALTY" value={(data.student.speciality || '-').toUpperCase()} colSpan={2} />
                <IdentityCell
                  label="CLASS"
                  value={(data.student.className || data.student.class || '-').toUpperCase()}
                />
                <IdentityCell label="CLASS MASTER" value={data.student.classMaster || '-'} colSpan={3} />
              </tr>
            </tbody>
          </table>

          <div className="classic-term-subjects-wrap">
          <table className="classic-term-grid classic-term-subjects">
            <thead>
              <tr className="classic-term-fill">
                <th style={{ textAlign: 'left', width: '24%' }}>SUBJECTS</th>
                <th>COEF</th>
                {slots.map((_, index) => (
                  <th key={slots[index]}>SEQ {index + 1}</th>
                ))}
                <th>AVERAGE</th>
                <th>TOTAL</th>
                <th>GRADE</th>
                <th style={{ textAlign: 'left' }}>REMARKS</th>
                <th>SIGN.</th>
              </tr>
            </thead>
            <tbody>
              {groupedSubjects.map((group) => {
                const rows = group.subjects.map((subject) => {
                  const cells = classicTermSubjectCells(
                    slots.map((slot) => subjectSequenceMark(subject, slot)),
                  );
                  return {
                    subject,
                    coefficient: subjectCoefficient(subject),
                    ...cells,
                  };
                });
                const rollup = classicTermGroupRollup(rows);
                return (
                  <Fragment key={group.key}>
                    {rows.map((row) => (
                      <tr key={row.subject.subjectId ?? row.subject.subjectName}>
                        <td style={{ textAlign: 'left' }}>
                          <div className="classic-display" style={{ fontWeight: 700, fontSize: '9px' }}>
                            {row.subject.subjectName.toUpperCase()}
                          </div>
                          {row.subject.teacherName ? (
                            <div
                              style={{
                                fontSize: '7px',
                                fontWeight: 500,
                                fontStyle: 'italic',
                                color: LABEL_GRAY,
                              }}
                            >
                              {row.subject.teacherName}
                            </div>
                          ) : null}
                        </td>
                        <td className="classic-mono" style={{ textAlign: 'center' }}>
                          {row.coefficient || '-'}
                        </td>
                        {row.sequences.map((mark, index) => (
                          <td
                            key={`${row.subject.subjectName}-seq-${index}`}
                            className="classic-mono"
                            style={{ textAlign: 'center' }}
                          >
                            {mark == null ? '-' : formatClassicAverage(mark)}
                          </td>
                        ))}
                        <td className="classic-mono" style={{ textAlign: 'center' }}>
                          {formatClassicAverage(row.average)}
                        </td>
                        <td className="classic-mono" style={{ textAlign: 'center' }}>
                          {row.total == null ? '-' : formatClassicAverage(row.total)}
                        </td>
                        <td className="classic-mono" style={{ textAlign: 'center' }}>
                          {row.subject.grade || '-'}
                        </td>
                        <td
                          className={row.subject.remarks ? 'classic-remarks' : 'classic-mono'}
                          style={{ textAlign: 'left' }}
                        >
                          {row.subject.remarks || '-'}
                        </td>
                        <td />
                      </tr>
                    ))}
                    <tr className="classic-term-summary">
                      <td style={{ textAlign: 'left' }}>{group.label.toUpperCase()}</td>
                      <td className="classic-mono" style={{ textAlign: 'center' }}>
                        {rollup.coefficient || '-'}
                      </td>
                      {slots.map((slot) => (
                        <td key={`${group.key}-seq-${slot}`} style={{ textAlign: 'center' }}>
                          -
                        </td>
                      ))}
                      <td className="classic-mono" style={{ textAlign: 'center' }}>
                        {formatClassicAverage(rollup.average)}
                      </td>
                      <td className="classic-mono" style={{ textAlign: 'center' }}>
                        {rollup.total == null ? '-' : formatClassicAverage(rollup.total)}
                      </td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'left' }}>
                        {rollup.passed == null ? '-' : rollup.passed ? 'PASSED' : 'FAILED'}
                      </td>
                      <td />
                    </tr>
                  </Fragment>
                );
              })}
              <tr className="classic-term-summary">
                <td style={{ textAlign: 'left' }}>TOTAL SUMMARY / BILAN TOTALE</td>
                <td className="classic-mono" style={{ textAlign: 'center' }}>
                  {grand.coefficient || '-'}
                </td>
                {slots.map((slot) => (
                  <td key={`grand-seq-${slot}`} style={{ textAlign: 'center' }}>
                    -
                  </td>
                ))}
                <td className="classic-mono" style={{ textAlign: 'center' }}>
                  {formatClassicAverage(grand.average)}
                </td>
                <td className="classic-mono" style={{ textAlign: 'center' }}>
                  {grand.total == null ? '-' : formatClassicAverage(grand.total)}
                </td>
                <td style={{ textAlign: 'center' }}>-</td>
                <td style={{ textAlign: 'left' }}>
                  {grand.passed == null ? '-' : grand.passed ? 'PASSED' : 'FAILED'}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1.1fr 1.8fr',
              gap: 0,
              alignItems: 'stretch',
            }}
          >
            <table className="classic-term-grid" style={{ height: '100%' }}>
              <thead>
                <tr className="classic-term-fill">
                  <th colSpan={2} style={{ textAlign: 'left', fontSize: '8px' }}>
                    STUDENT&apos;S EVALUATION RESULTS
                  </th>
                </tr>
              </thead>
              <tbody>
                <FooterMetricRow label="TERM" value={String(termNumber)} />
                <FooterMetricRow
                  label="AVERAGE"
                  value={data.totals.average.toFixed(2)}
                  accent
                />
                <FooterMetricRow label="RANK" value={formatRank(data.history.rank)} accent />
              </tbody>
            </table>

            <table className="classic-term-grid" style={{ height: '100%' }}>
              <thead>
                <tr className="classic-term-fill">
                  <th colSpan={2} style={{ textAlign: 'left', fontSize: '8px' }}>
                    ABSENCES &amp; CONDUCT
                  </th>
                </tr>
              </thead>
              <tbody>
                <FooterMetricRow label="JUSTIFIED ABSENCES" value={String(justified)} />
                <FooterMetricRow label="UNJUSTIFIED ABSENCES" value={String(unjustified)} />
                <FooterMetricRow label="TOTAL ABSENCES" value={String(totalAbsences)} />
              </tbody>
            </table>

            <table className="classic-term-grid" style={{ height: '100%' }}>
              <thead>
                <tr className="classic-term-fill">
                  <th colSpan={4} style={{ textAlign: 'left', fontSize: '8px' }}>
                    CLASS STATISTICS
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="classic-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                    {data.stats.classSize}
                  </td>
                  <td style={{ fontSize: '7px', fontWeight: 700, textAlign: 'center' }}># PASSED</td>
                  <td className="classic-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                    {data.stats.passed}
                  </td>
                  <td style={{ fontSize: '7px', fontWeight: 700, textAlign: 'center' }}>
                    % PASSED{' '}
                    <span className="classic-mono">{formatPercent(data.stats.passPercent)}</span>
                  </td>
                </tr>
                <tr className="classic-term-summary">
                  <td colSpan={4} style={{ textAlign: 'center', fontSize: '8px' }}>
                    CLASS AVERAGE{' '}
                    <span className="classic-mono" style={{ marginLeft: 6 }}>
                      ({classAvg})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontSize: '7px', fontWeight: 700, textAlign: 'center' }}># FAILED</td>
                  <td className="classic-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                    {data.stats.failed}
                  </td>
                  <td style={{ fontSize: '7px', fontWeight: 700, textAlign: 'center' }}>% FAILED</td>
                  <td className="classic-mono" style={{ textAlign: 'center', fontWeight: 700 }}>
                    {formatPercent(data.stats.failPercent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="classic-display"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              marginTop: 28,
              marginBottom: 12,
              textAlign: 'center',
              fontWeight: 500,
              fontSize: '11px',
              fontStyle: 'italic',
              color: LABEL_GRAY,
            }}
          >
            <div>Sign Parent/Guardian</div>
            <div>Sign Class Master</div>
            <div>Sign Principal</div>
          </div>
        </div>
      </ReportCardSheet>
    </>
  );
}
