'use client';

import Link from 'next/link';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoveLeft } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { StaffEditForm } from '@/components/acadia/staff/staff-edit-form';
import { useStaffDetailQuery } from '@/hooks/use-staff-detail-query';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

export default function StaffEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const canEdit = canWriteRegistry(session?.roleSlug);
  const { data, isLoading, isError, error } = useStaffDetailQuery(id);

  useEffect(() => {
    if (!canEdit && session) {
      router.replace(`/staff/${data?.id ?? id}`);
    }
  }, [canEdit, session, router, id, data?.id]);

  useEffect(() => {
    if (data?.id && data.id !== id) {
      router.replace(`/staff/${data.id}/edit`);
    }
  }, [data?.id, id, router]);

  if (!canEdit) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : t('staff.loadFailed')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/staff/${data.id}`}>
          <MoveLeft className="size-4" />
          {t('staff.backToProfile')}
        </Link>
      </Button>
      <h1 className="text-xl font-semibold">{t('staff.editTitle')}</h1>
      <StaffEditForm
        staff={{
          profileId: data.id,
          staffCode: data.staffCode,
          title: data.title,
          firstName: data.firstName,
          lastName: data.lastName,
          personalEmail: data.personalEmail,
          phone: data.phone,
          address: data.address,
          city: data.city,
          region: data.region,
          qualifications: data.qualifications,
          teachingExperience: data.teachingExperience,
          employmentType: data.employmentType,
          hireDate: data.hireDate,
          monthlySalary: data.monthlySalary,
          emergencyContactName: data.emergencyContactName,
          emergencyContactRelationship: data.emergencyContactRelationship,
          emergencyContactPhone: data.emergencyContactPhone,
          bio: data.bio,
          officeRoom: data.officeRoom,
          officePhone: data.officePhone,
          departmentId: data.departmentId,
          isActive: data.isActive,
        }}
      />
    </div>
  );
}
