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
      toast.success('Profile completed. Welcome to Acadia College.');
      router.replace(getDashboardPathForRole(session?.roleSlug) ?? '/dashboard/staff');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save your profile.',
      );
    }
  }

  const profile = status?.profile;
  const displayName = [profile?.title, profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <AcadiaPageShell
      title="Complete your teacher profile"
      description="Confirm your contact details and emergency contact before using the staff dashboard."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Your account</CardTitle>
              <CardDescription>
                These details were set by your administrator. Contact the registry
                office if anything is incorrect.
              </CardDescription>
            </CardHeader>
            <CardContent className={GRID}>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{formatRecordValue(displayName || null)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Staff code</p>
                <p className="font-medium">{formatRecordValue(profile?.staffCode)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Contact email</p>
                <p className="font-medium">
                  {formatRecordValue(profile?.personalEmail)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact &amp; office</CardTitle>
            </CardHeader>
            <CardContent className={GRID}>
              <PhoneFormFields
                control={form.control}
                countryName="phoneCountry"
                phoneName="phone"
                phoneLabel="Mobile phone"
                required
                hideCountry
                className="sm:col-span-2"
              />
              <FormField
                control={form.control}
                name="officeRoom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Office / room</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Block B, Room 12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <PhoneFormFields
                control={form.control}
                countryName="officePhoneCountry"
                phoneName="officePhone"
                phoneLabel="Office phone"
                hideCountry
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Short bio</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional — shown on your staff profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency contact</CardTitle>
            </CardHeader>
            <CardContent className={GRID}>
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name <span className="text-destructive">*</span>
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
                    <FormLabel>Relationship</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                phoneLabel="Contact phone"
                required
                hideCountry
                className="sm:col-span-2"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || isLoading}>
              {mutation.isPending ? 'Saving…' : 'Complete profile'}
            </Button>
          </div>
        </form>
      </Form>
    </AcadiaPageShell>
  );
}
