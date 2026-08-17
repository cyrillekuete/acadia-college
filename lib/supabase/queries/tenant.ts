import { SupabaseClient } from '@supabase/supabase-js';

export type AcadiaTenant = {
  id: string;
  slug: string;
  displayNameEn: string;
  displayNameFr: string;
  status: string;
  deploymentMode: string;
  planSlug: string | null;
  locale: string;
  timezone: string;
  country: string | null;
  logoStorageKey: string | null;
  reportCardLogoStorageKey: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  institutionEmail: string | null;
  institutionPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  websiteUrl: string | null;
  secondaryContactName: string | null;
  secondaryContactEmail: string | null;
  academicYearStartMonth: number | null;
  sessionTimeoutMinutes: number;
  sessionWarningMinutes: number;
  minimumAttendancePercent: number;
  showAttendanceOnTranscript: boolean;
  markEntryCalendarPolicy: string;
  enabledModules: string[];
  usePlatformEmailRelay: boolean;
  customDomain: string | null;
  pdfIssuerDisplayNameEn: string | null;
  pdfIssuerDisplayNameFr: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ACADIA_TENANT_SELECT = `
  id,
  slug,
  displayNameEn,
  displayNameFr,
  status,
  deploymentMode,
  planSlug,
  locale,
  timezone,
  country,
  logoStorageKey,
  reportCardLogoStorageKey,
  primaryColor,
  accentColor,
  institutionEmail,
  institutionPhone,
  addressLine1,
  addressLine2,
  city,
  region,
  websiteUrl,
  secondaryContactName,
  secondaryContactEmail,
  academicYearStartMonth,
  sessionTimeoutMinutes,
  sessionWarningMinutes,
  minimumAttendancePercent,
  showAttendanceOnTranscript,
  markEntryCalendarPolicy,
  enabledModules,
  usePlatformEmailRelay,
  customDomain,
  pdfIssuerDisplayNameEn,
  pdfIssuerDisplayNameFr,
  createdAt,
  updatedAt
`;

export async function fetchAcadiaTenant(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<AcadiaTenant | null> {
  const { data, error } = await supabase
    .from('Tenant')
    .select(ACADIA_TENANT_SELECT)
    .eq('id', tenantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as Record<string, unknown>;
  const modules = row.enabledModules;
  const enabledModules = Array.isArray(modules)
    ? modules.map(String)
    : [];

  return {
    ...(row as Omit<AcadiaTenant, 'enabledModules'>),
    enabledModules,
  };
}
