'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircleIcon, Pencil, Printer } from '@/lib/icons';
import { ApplicationReviewActions } from '@/components/acadia/enrollment/application-review-actions';
import {
  ENROLLMENT_APPLICATION_FORM_ID,
  EnrollmentApplicationForm,
  type EnrollmentApplicationRecord,
} from '@/components/acadia/enrollment/enrollment-application-form';
import {
  EnrollmentConfirmationView,
  type EnrollmentConfirmationData,
} from '@/components/acadia/enrollment/enrollment-confirmation-view';
import { RecordDetailCard } from '@/components/acadia/record-detail-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useTranslation } from '@/hooks/useTranslation';
import {
  applicantDisplayName,
  canEditEnrollmentApplication,
  enrollmentApplicationsHref,
  type EnrollmentApplicationView,
} from '@/lib/acadia/enrollment';
import {
  formatDateTime,
  formatPhoneRecordValue,
  formatRecordValue,
  levelLabel,
  streamLabel,
  unwrapRelation,
} from '@/lib/acadia/record-display';
import { canWriteRegistry } from '@/lib/acadia/roles';

const SHEET_CONTENT_CLASS =
  'p-0 gap-0 sm:w-[540px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5 print:static print:inset-auto print:h-auto print:w-full print:max-w-none print:rounded-none print:border-0 print:shadow-none';

const APPLICATION_SELECT = `
  id,
  kind,
  status,
  firstNameEn,
  lastNameEn,
  firstNameFr,
  lastNameFr,
  email,
  phone,
  dateOfBirth,
  preferredLocale,
  studentProfileId,
  subSystem,
  branch,
  levelId,
  academicYearId,
  rejectionReason,
  reviewedAt,
  createdAt,
  Level!EnrollmentApplication_levelId_tenantId_fkey ( number, labelEn ),
  AcademicYear!EnrollmentApplication_academicYearId_tenantId_fkey ( label ),
  StudentProfile!EnrollmentApplication_studentProfileId_tenantId_fkey ( id, registrationNumber )
`;

const EDIT_FORM_ID = `${ENROLLMENT_APPLICATION_FORM_ID}-edit`;

type ApplicationDetail = {
  id: string;
  kind: string;
  status: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameFr?: string | null;
  lastNameFr?: string | null;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  preferredLocale?: string;
  studentProfileId?: string | null;
  subSystem: string;
  branch: string;
  levelId: string;
  academicYearId?: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  Level?: unknown;
  AcademicYear?: unknown;
  StudentProfile?: unknown;
};

function toEditRecord(data: ApplicationDetail): EnrollmentApplicationRecord | null {
  if (data.kind !== 'NEW' && data.kind !== 'RE_ENROLL') {
    return null;
  }
  return {
    id: data.id,
    kind: data.kind,
    status: data.status,
    firstNameEn: data.firstNameEn,
    lastNameEn: data.lastNameEn,
    firstNameFr: data.firstNameFr,
    lastNameFr: data.lastNameFr,
    email: data.email,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    preferredLocale: data.preferredLocale === 'fr' ? 'fr' : 'en',
    studentProfileId: data.studentProfileId,
    subSystem: data.subSystem,
    branch: data.branch,
    levelId: data.levelId,
    academicYearId: data.academicYearId ?? '',
  };
}

export function ApplicationReviewSheet({
  applicationId,
  view = 'review',
  open,
  onOpenChange,
}: {
  applicationId: string | null;
  view?: EnrollmentApplicationView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const canManage = canWriteRegistry(session?.roleSlug);
  const [editPending, setEditPending] = useState(false);

  const [cachedId, setCachedId] = useState<string | null>(applicationId);
  if (applicationId && applicationId !== cachedId) {
    setCachedId(applicationId);
  }
  const activeId = applicationId ?? cachedId;

  const { data, isLoading, isError, error } = useSupabaseRecord<ApplicationDetail>(
    'EnrollmentApplication',
    activeId ?? undefined,
    APPLICATION_SELECT,
  );

  const level = unwrapRelation<{ number?: number; labelEn?: string }>(data?.Level);
  const year = unwrapRelation<{ label?: string }>(data?.AcademicYear);
  const student = unwrapRelation<{ id?: string; registrationNumber?: string }>(
    data?.StudentProfile,
  );

  const title = data
    ? applicantDisplayName(
        data.firstNameEn,
        data.lastNameEn,
        data.firstNameFr,
        data.lastNameFr,
      )
    : t('enrollment.applicationDetails');

  const showEdit = Boolean(
    canManage && data && canEditEnrollmentApplication(data.status),
  );
  const editRecord = data ? toEditRecord(data) : null;
  const confirmationData = data as EnrollmentConfirmationData | undefined;

  const showReview = () => {
    if (!activeId) {
      return;
    }
    router.replace(enrollmentApplicationsHref(activeId), { scroll: false });
  };

  const sheetTitle =
    view === 'edit'
      ? t('enrollment.editApplication')
      : view === 'confirmation'
        ? t('enrollment.confirmation')
        : title;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {view === 'confirmation' ? (
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #enrollment-confirmation-print, #enrollment-confirmation-print * { visibility: visible; }
            #enrollment-confirmation-print {
              position: absolute;
              inset: 0;
              width: 100%;
              background: white;
            }
          }
        `}</style>
      ) : null}
      <SheetContent className={SHEET_CONTENT_CLASS}>
        <SheetHeader className="mb-0 border-b border-border print:hidden">
          <div className="space-y-1 p-3 pe-12">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle>{sheetTitle}</SheetTitle>
              {data && view !== 'edit' ? (
                <Badge
                  variant={data.status === 'APPROVED' ? 'success' : 'secondary'}
                  appearance="light"
                >
                  {data.status}
                </Badge>
              ) : null}
            </div>
            {view === 'review' ? (
              <SheetDescription>{t('enrollment.reviewDescription')}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>
            )}
          </div>
        </SheetHeader>
        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-12.5rem)] print:h-auto">
            <div className="space-y-5 px-5 py-2.5">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('common.messages.loading')}</p>
              ) : null}
              {isError ? (
                <p className="text-sm text-destructive">{String(error)}</p>
              ) : null}
              {data && view === 'review' ? (
                <>
                  <RecordDetailCard
                    title={t('enrollment.applicant')}
                    fields={[
                      { label: 'Email', value: formatRecordValue(data.email) },
                      { label: 'Phone', value: formatPhoneRecordValue(data.phone) },
                      {
                        label: 'Date of birth',
                        value: formatRecordValue(data.dateOfBirth),
                      },
                      { label: 'Type', value: formatRecordValue(data.kind) },
                      { label: 'Submitted', value: formatDateTime(data.createdAt) },
                    ]}
                  />
                  <RecordDetailCard
                    title={t('enrollment.placement')}
                    fields={[
                      { label: 'Academic year', value: formatRecordValue(year?.label) },
                      {
                        label: 'Sub-system / branch',
                        value: streamLabel(data.subSystem, data.branch),
                      },
                      { label: 'Level', value: levelLabel(level) },
                    ]}
                  />
                  {data.status === 'REJECTED' && data.rejectionReason ? (
                    <RecordDetailCard
                      title={t('enrollment.rejection')}
                      fields={[
                        { label: 'Reason', value: data.rejectionReason },
                        { label: 'Reviewed', value: formatDateTime(data.reviewedAt) },
                      ]}
                    />
                  ) : null}
                  {student?.registrationNumber ? (
                    <RecordDetailCard
                      title={t('enrollment.studentRecord')}
                      fields={[
                        {
                          label: 'Student ID',
                          value: (
                            <Link
                              href={`/students/${student.id}`}
                              className="text-primary hover:underline"
                            >
                              {student.registrationNumber}
                            </Link>
                          ),
                        },
                        { label: 'Approved', value: formatDateTime(data.reviewedAt) },
                      ]}
                    />
                  ) : null}
                </>
              ) : null}
              {data && view === 'edit' ? (
                showEdit && editRecord ? (
                  <EnrollmentApplicationForm
                    record={editRecord}
                    hideActions
                    formId={EDIT_FORM_ID}
                    onCancel={showReview}
                    onSaved={showReview}
                    onPendingChange={setEditPending}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Only pending applications can be edited.
                  </p>
                )
              ) : null}
              {data && view === 'confirmation' ? (
                data.status === 'APPROVED' && confirmationData ? (
                  <div id="enrollment-confirmation-print">
                    <EnrollmentConfirmationView data={confirmationData} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Confirmation is only available for approved applications.
                  </p>
                )
              ) : null}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 print:hidden">
          {view === 'edit' ? (
            <>
              <Button type="button" variant="outline" onClick={showReview}>
                {t('common.buttons.cancel')}
              </Button>
              {showEdit && editRecord ? (
                <Button type="submit" form={EDIT_FORM_ID} disabled={editPending}>
                  {editPending ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  {t('common.messages.saveChanges')}
                </Button>
              ) : null}
            </>
          ) : null}
          {view === 'confirmation' ? (
            <>
              <Button type="button" variant="outline" onClick={showReview}>
                {t('common.buttons.back')}
              </Button>
              {data?.status === 'APPROVED' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="size-4" />
                  {t('common.buttons.print')}
                </Button>
              ) : null}
            </>
          ) : null}
          {view === 'review' ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.buttons.close')}
              </Button>
              {showEdit && activeId ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={enrollmentApplicationsHref(activeId, 'edit')} scroll={false}>
                    <Pencil className="size-4" />
                    {t('common.buttons.edit')}
                  </Link>
                </Button>
              ) : null}
              {canManage && data && activeId ? (
                <ApplicationReviewActions
                  applicationId={activeId}
                  status={data.status}
                  levelId={data.levelId}
                  subSystem={data.subSystem}
                  branch={data.branch}
                />
              ) : null}
            </>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
