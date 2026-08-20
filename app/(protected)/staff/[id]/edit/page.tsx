'use client';

import Link from 'next/link';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MoveLeft } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { StaffEditForm } from '@/components/acadia/staff/staff-edit-form';
import { useSupabaseRecord } from '@/hooks/use-supabase-record';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import { canWriteRegistry } from '@/lib/acadia/roles';
import { useTranslation } from '@/hooks/useTranslation';

const STAFF_EDIT_SELECT = `
  id,
  staffCode,
  title,
  firstName,
  lastName,
  personalEmail,
  phone,
  address,
  city,
  region,
  qualifications,
  teachingExperience,
  employmentType,
  hireDate,
  monthlySalary,
  emergencyContactName,
  emergencyContactRelationship,
  emergencyContactPhone,
  bio,
  officeRoom,
  officePhone,
  departmentId,
  isActive
`;

type StaffEditRow = {
  id: string;
  staffCode: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  qualifications: string | null;
  teachingExperience: string | null;
  employmentType: string;
  hireDate: string | null;
  monthlySalary: number | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  bio: string | null;
  officeRoom: string | null;
  officePhone: string | null;
  departmentId: string | null;
  isActive: boolean;
};

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
  const { data, isLoading, isError, error } = useSupabaseRecord<StaffEditRow>(
    'StaffProfile',
    id,
    STAFF_EDIT_SELECT,
  );

  useEffect(() => {
    if (!canEdit && session) {
      router.replace(`/staff/${id}`);
    }
  }, [canEdit, session, router, id]);

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
        <Link href={`/staff/${id}`}>
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
