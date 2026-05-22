'use client';

import { useEffect, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { studentCreateSchema, type StudentCreateInput, type StudentCreateFormValues } from '@/lib/acadia/student-create-schemas';
import { useStudentCreateMutation } from '@/hooks/use-student-create-mutation';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import {
  useClassesForFilters,
  useLevelsForStream,
} from '@/hooks/use-enrollment-catalog-options';
import { levelDisplayLabel } from '@/lib/acadia/education-system';
import { toAcademicBranch, toAcademicSubSystem } from '@/lib/acadia/catalog-maps';
import { CityAutocomplete } from '@/components/acadia/location/city-autocomplete';
import { CountryCombobox } from '@/components/acadia/location/country-combobox';
import { RegionSelect } from '@/components/acadia/location/region-select';
import { PhoneFormFields } from '@/components/acadia/phone/phone-form-field';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import { isCityValidForLocation } from '@/lib/acadia/locations';

const SECTION_GRID =
  'grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-center';

const ROW_GRID_4 =
  'grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-center';

const ROW_GRID_2 =
  'grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:items-center';

const FIELD_ITEM =
  'flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4';

const FIELD_LABEL =
  'sm:mb-0 sm:w-36 sm:max-w-[9rem] shrink-0 sm:text-end';

const FIELD_CONTROL =
  'flex min-w-0 flex-1 flex-col justify-center gap-1.5';

function StudentFieldItem({
  className,
  ...props
}: ComponentProps<typeof FormItem>) {
  return <FormItem className={cn(FIELD_ITEM, className)} {...props} />;
}

function StudentFieldLabel({
  className,
  ...props
}: ComponentProps<typeof FormLabel>) {
  return <FormLabel className={cn(FIELD_LABEL, className)} {...props} />;
}

function StudentFieldControl({
  className,
  ...props
}: ComponentProps<'div'>) {
  return <div className={cn(FIELD_CONTROL, className)} {...props} />;
}

export function StudentCreateForm() {
  const router = useRouter();
  const mutation = useStudentCreateMutation();
  const { activeYear, activeYearId } = useActiveAcademicYear();

  const form = useForm<StudentCreateFormValues, unknown, StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      is_new_student: true,
      nationality: 'Cameroonian',
      country: DEFAULT_COUNTRY_NAME,
      phone_country: DEFAULT_COUNTRY_NAME,
      parent_phone_country: DEFAULT_COUNTRY_NAME,
      emergency_contact_phone_country: DEFAULT_COUNTRY_NAME,
      parent_relationship: 'father',
      academic_year: '',
      academic_year_id: '',
      level_id: '',
      class_id: '',
    },
  });

  const watchedSubsystem = form.watch('subsystem');
  const watchedBranch = form.watch('branch');
  const catalogSubSystem = toAcademicSubSystem(watchedSubsystem);
  const catalogBranch = toAcademicBranch(watchedBranch);

  const { data: levels = [] } = useLevelsForStream(
    catalogSubSystem,
    catalogBranch,
  );
  const { data: classOptions = [] } = useClassesForFilters({
    subSystem: catalogSubSystem,
    branch: catalogBranch,
    levelId: form.watch('level_id') || null,
  });

  useEffect(() => {
    if (activeYear?.label) {
      form.setValue('academic_year', activeYear.label, { shouldDirty: false });
    }
    if (activeYearId) {
      form.setValue('academic_year_id', activeYearId, { shouldDirty: false });
    }
  }, [activeYear?.label, activeYearId, form]);

  useEffect(() => {
    const current = form.getValues('level_id');
    if (current && !levels.some((l) => l.id === current)) {
      form.setValue('level_id', '');
      form.setValue('class_id', '');
    }
  }, [catalogSubSystem, catalogBranch, levels, form]);

  async function onSubmit(values: StudentCreateInput) {
    const result = await mutation.mutateAsync(values).catch((err: Error) => {
      toast.error(err.message ?? 'Failed to create student.');
      return null;
    });

    if (!result) return;

    toast.success(
      `Student ${result.studentId} created. Password-setup emails sent${result.newParentAuthCreated ? ' to student and parent' : ' to student'}.`,
    );
    router.push(`/students/${result.studentProfileId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── Section 1: Identity ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className={SECTION_GRID}>
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>First name <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="last_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Last name <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="middle_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Middle name</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="date_of_birth" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Date of birth</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" type="date" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="gender" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Gender</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="place_of_birth" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Place of birth</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="nationality" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Nationality</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="religion" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Religion</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />
          </CardContent>
        </Card>

        {/* ── Section 2: Contact ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
          </CardHeader>
          <CardContent className={SECTION_GRID}>
            <FormField control={form.control} name="email" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Email <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" type="email" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="country" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Country</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <CountryCombobox
                      className="w-full"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('phone_country', value, { shouldDirty: true });
                        form.setValue('region', '', { shouldDirty: true });
                        form.setValue('city', '', { shouldDirty: true });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <PhoneFormFields
              control={form.control}
              countryName="phone_country"
              phoneName="phone"
              hideCountry
              className={cn(FIELD_ITEM, 'space-y-0')}
            />

            <FormField control={form.control} name="address" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Address</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="region" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Region</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <RegionSelect
                      className="w-full"
                      country={form.watch('country')}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const country = form.getValues('country');
                        const city = form.getValues('city');
                        if (
                          city &&
                          !isCityValidForLocation(country ?? '', value, city)
                        ) {
                          form.setValue('city', '', { shouldDirty: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="city" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>City</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <CityAutocomplete
                      country={form.watch('country')}
                      region={form.watch('region')}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />
          </CardContent>
        </Card>

        {/* ── Section 3: Academic ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Academic information</CardTitle>
          </CardHeader>
          <CardContent className={SECTION_GRID}>
            <FormField control={form.control} name="subsystem" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Subsystem</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subsystem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="branch" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Branch</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="grammar">Grammar</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="academic_year" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Academic year</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <Input className="w-full" {...field} disabled readOnly />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="level_id" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Level <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!catalogSubSystem || !catalogBranch}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {levels.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {levelDisplayLabel(l)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="class_id" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Class</StudentFieldLabel>
                <StudentFieldControl>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === '__none__' ? '' : value);
                      const selected = classOptions.find((c) => c.id === value);
                      if (selected?.name) {
                        form.setValue('class_name', String(selected.name));
                      }
                    }}
                    value={field.value || '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select class (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Auto-assign if unique</SelectItem>
                      {classOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="previous_school" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Previous school</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="previous_class" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Previous class</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="enrollment_date" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Enrolment date</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" type="date" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="matricule_number" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Matricule (optional)</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <Input
                      className="w-full"
                      placeholder="Ministry-issued matricule"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the official matricule if issued by the ministry. Leave blank if not yet assigned.
                  </FormDescription>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField
              control={form.control}
              name="is_new_student"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 sm:col-span-2 lg:col-span-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal leading-none">
                    New student (first enrolment)
                  </FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Section 4: Parent / Guardian ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Parent / Guardian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={ROW_GRID_4}>
              <FormField control={form.control} name="parent_name" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Full name <span className="text-destructive">*</span></StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <FormField control={form.control} name="parent_email" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Email</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" type="email" {...field} /></FormControl>
                    <FormDescription>
                      Optional — used for portal login if provided.
                    </FormDescription>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <FormField control={form.control} name="parent_phone_country" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Country</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl>
                      <CountryCombobox
                        className="w-full"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <PhoneFormFields
                control={form.control}
                countryName="parent_phone_country"
                phoneName="parent_phone"
                required
                hideCountry
                className={cn(FIELD_ITEM, 'space-y-0')}
              />
            </div>

            <div className={SECTION_GRID}>
            <FormField control={form.control} name="parent_relationship" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Relationship <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_occupation" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Occupation</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_address" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>Address</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 5: Emergency / Medical (optional) ───────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency contact &amp; medical (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={ROW_GRID_2}>
              <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Contact name</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <FormField control={form.control} name="emergency_contact_phone_country" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Country</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl>
                      <CountryCombobox
                        className="w-full"
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <PhoneFormFields
                control={form.control}
                countryName="emergency_contact_phone_country"
                phoneName="emergency_contact_phone"
                phoneLabel="Phone"
                hideCountry
                className={cn(FIELD_ITEM, 'space-y-0')}
              />

              <FormField control={form.control} name="emergency_contact_relationship" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Relationship</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />
            </div>

            <Separator />

            <div className={SECTION_GRID}>
              <FormField control={form.control} name="blood_group" render={({ field }) => (
                <StudentFieldItem>
                  <StudentFieldLabel>Blood group</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" placeholder="e.g. O+" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <FormField control={form.control} name="allergies" render={({ field }) => (
                <StudentFieldItem className="sm:col-span-2">
                  <StudentFieldLabel>Allergies</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" placeholder="List any known allergies" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />

              <FormField control={form.control} name="medical_conditions" render={({ field }) => (
                <StudentFieldItem className="sm:col-span-2">
                  <StudentFieldLabel>Medical conditions</StudentFieldLabel>
                  <StudentFieldControl>
                    <FormControl><Input className="w-full" placeholder="List any known conditions" {...field} /></FormControl>
                    <FormMessage />
                  </StudentFieldControl>
                </StudentFieldItem>
              )} />
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/students')}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create student'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
