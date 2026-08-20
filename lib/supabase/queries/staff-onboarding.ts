import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StaffOnboardingFormValues,
  StaffOnboardingInput,
} from '@/lib/acadia/staff-onboarding-schemas';
import { staffNeedsOnboarding } from '@/lib/acadia/staff-onboarding';
import { splitPhoneE164 } from '@/lib/acadia/phone';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type StaffOnboardingProfile = {
  staffProfileId: string;
  staffCode: string | null;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  phone: string | null;
  bio: string | null;
  officeRoom: string | null;
  officePhone: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  onboardingCompletedAt: string | null;
};

export type StaffOnboardingStatus = {
  profile: StaffOnboardingProfile | null;
  needsOnboarding: boolean;
  /** True when the user has no active StaffProfile (deactivated or missing). */
  blocked: boolean;
};

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function fetchStaffOnboardingStatus(
  supabase: Client,
  tenantId: string,
  userId: string,
): Promise<StaffOnboardingStatus> {
  const { data, error } = await supabase
    .from('StaffProfile')
    .select(
      `
      id,
      staffCode,
      title,
      firstName,
      lastName,
      personalEmail,
      phone,
      bio,
      officeRoom,
      officePhone,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      onboardingCompletedAt,
      isActive
    `,
    )
    .eq('tenantId', tenantId)
    .eq('userId', userId)
    .order('isActive', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { profile: null, needsOnboarding: false, blocked: true };
  }

  const profile: StaffOnboardingProfile = {
    staffProfileId: data.id,
    staffCode: data.staffCode,
    title: data.title,
    firstName: data.firstName,
    lastName: data.lastName,
    personalEmail: data.personalEmail,
    phone: data.phone,
    bio: data.bio,
    officeRoom: data.officeRoom,
    officePhone: data.officePhone,
    emergencyContactName: data.emergencyContactName,
    emergencyContactRelationship: data.emergencyContactRelationship,
    emergencyContactPhone: data.emergencyContactPhone,
    onboardingCompletedAt: data.onboardingCompletedAt,
  };

  return {
    profile,
    needsOnboarding: staffNeedsOnboarding(data.onboardingCompletedAt),
    blocked: data.isActive === false,
  };
}

export function staffOnboardingFormDefaults(
  profile: StaffOnboardingProfile | null | undefined,
): StaffOnboardingFormValues {
  const phone = splitPhoneE164(profile?.phone);
  const officePhone = splitPhoneE164(profile?.officePhone);
  const emergencyPhone = splitPhoneE164(profile?.emergencyContactPhone);

  return {
    phoneCountry: phone.countryName,
    phone: phone.nationalNumber,
    bio: profile?.bio ?? '',
    officeRoom: profile?.officeRoom ?? '',
    officePhoneCountry: officePhone.countryName,
    officePhone: officePhone.nationalNumber,
    emergencyContactName: profile?.emergencyContactName ?? '',
    emergencyContactRelationship:
      (profile?.emergencyContactRelationship as StaffOnboardingFormValues['emergencyContactRelationship']) ??
      'spouse',
    emergencyContactPhoneCountry: emergencyPhone.countryName,
    emergencyContactPhone: emergencyPhone.nationalNumber,
  };
}

export async function completeStaffOnboarding(
  supabase: Client,
  tenantId: string,
  staffProfileId: string,
  input: StaffOnboardingInput,
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('StaffProfile')
    .update({
      phone: input.phone,
      bio: emptyToNull(input.bio),
      officeRoom: emptyToNull(input.officeRoom),
      officePhone: emptyToNull(input.officePhone),
      emergencyContactName: input.emergencyContactName.trim(),
      emergencyContactRelationship: input.emergencyContactRelationship,
      emergencyContactPhone: input.emergencyContactPhone,
      onboardingCompletedAt: now,
      updatedAt: now,
    })
    .eq('tenantId', tenantId)
    .eq('id', staffProfileId);

  if (error) {
    throw error;
  }
}
