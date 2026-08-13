'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AcadiaPageShell } from '@/components/acadia/page-shell';
import { PhoneFormFields } from '@/components/acadia/phone/phone-form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useStaffOnboardingMutation,
  useStaffOnboardingStatus,
} from '@/hooks/use-staff-onboarding';
import { getDashboardPathForRole } from '@/lib/auth/dashboard-routes';
import { useAcadiaCollegeSession } from '@/hooks/use-acadia-college-session';
import {
  staffOnboardingDefaultValues,
  staffOnboardingSchema,
  type StaffOnboardingFormValues,
  type StaffOnboardingInput,
} from '@/lib/acadia/staff-onboarding-schemas';
import { staffOnboardingFormDefaults } from '@/lib/supabase/queries/staff-onboarding';
import { formatRecordValue } from '@/lib/acadia/record-display';
import { useTranslation } from '@/hooks/useTranslation';

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
] as const;

const GRID = 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2';

export function StaffOnboardingForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useAcadiaCollegeSession();
  const { data: status, isLoading } = useStaffOnboardingStatus();
  const mutation = useStaffOnboardingMutation();

  const form =   useForm<StaffOnboardingFormValues, unknown, StaffOnboardingInput>({
    resolver: zodResolver(staffOnboardingSchema),
    defaultValues: staffOnboardingDefaultValues,
  });

  useEffect(() => {
    if (status?.profile) {
      form.reset(staffOnboardingFormDefaults(status.profile));
    }
  }, [form, status?.profile]);

  useEffect(() => {
    if (!isLoading && status && !status.needsOnboarding) {
      const destination =
        getDashboardPathForRole(session?.roleSlug) ?? '/dashboard/staff';
      router.replace(destination);
    }
  }, [isLoading, router, session?.roleSlug, status]);

  async function onSubmit(values: StaffOnboardingInput) {
    try {
      await mutation.mutateAsync(values);
      toast.success(t('staff.profileCompleted'));
      router.replace(getDashboardPathForRole(session?.roleSlug) ?? '/dashboard/staff');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('staff.profileSaveFailed'),
      );
    }
  }

  const profile = status?.profile;
  const displayName = [profile?.title, profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <AcadiaPageShell
      title={t('staff.onboardingTitle')}
      description={t('staff.onboardingDescription')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('staff.yourAccount')}</CardTitle>
              <CardDescription>
                {t('staff.accountHint')}
              </CardDescription>
            </CardHeader>
            <CardContent className={GRID}>
              <div>
                <p className="text-sm text-muted-foreground">{t('common.labels.name')}</p>
                <p className="font-medium">{formatRecordValue(displayName || null)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('staff.staffCode')}</p>
                <p className="font-medium">{formatRecordValue(profile?.staffCode)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">{t('staff.contactEmail')}</p>
                <p className="font-medium">
                  {formatRecordValue(profile?.personalEmail)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('staff.contactOffice')}</CardTitle>
            </CardHeader>
            <CardContent className={GRID}>
              <PhoneFormFields
                control={form.control}
                countryName="phoneCountry"
                phoneName="phone"
                phoneLabel={t('staff.mobilePhone')}
                required
                hideCountry
                className="sm:col-span-2"
              />
              <FormField
                control={form.control}
                name="officeRoom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('staff.officeRoom')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('staff.officeRoomPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PhoneFormFields
                control={form.control}
                countryName="officePhoneCountry"
                phoneName="officePhone"
                phoneLabel={t('staff.officePhone')}
                hideCountry
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('staff.shortBio')}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('staff.bioHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('staff.emergencyContact')}</CardTitle>
            </CardHeader>
            <CardContent className={GRID}>
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('common.labels.name')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.relationship')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('students.selectRelationship')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`staff.relationship.${option.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PhoneFormFields
                control={form.control}
                countryName="emergencyContactPhoneCountry"
                phoneName="emergencyContactPhone"
                phoneLabel={t('staff.contactPhone')}
                required
                hideCountry
                className="sm:col-span-2"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || isLoading}>
              {mutation.isPending ? t('common.messages.saving') : t('staff.completeProfile')}
            </Button>
          </div>
        </form>
      </Form>
    </AcadiaPageShell>
  );
}
