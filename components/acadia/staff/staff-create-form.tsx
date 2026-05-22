'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { PhoneFormFields } from '@/components/acadia/phone/phone-form-field';
import { CityAutocomplete } from '@/components/acadia/location/city-autocomplete';
import { RegionSelect } from '@/components/acadia/location/region-select';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import {
  staffCreateSchema,
  type StaffCreateInput,
  type StaffCreateFormValues,
} from '@/lib/acadia/staff-create-schemas';
import { staffEmploymentLabel } from '@/lib/acadia/staff-registry';
import {
  ACADEMIC_SUB_SYSTEMS,
  subSystemLabel,
  type AcademicSubSystem,
} from '@/lib/acadia/education-system';
import { downloadStaffCredentials } from '@/lib/acadia/download-credentials';
import { useStaffCreateMutation } from '@/hooks/use-staff-create-mutation';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'ADJUNCT', 'VISITING'] as const;
const STAFF_ROLE_SLUGS = new Set(['teacher', 'lecturer', 'staff']);
const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev', 'Other'] as const;
const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
] as const;

const GRID = 'grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

const ROW_4 =
  'grid w-full grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4';

const ROW_3 =
  'grid w-full grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3';

function CheckboxMultiSelect({
  options,
  value,
  onChange,
  emptyMessage,
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyMessage: string;
  disabled?: boolean;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
      {options.map((option) => {
        const checked = value.includes(option.id);
        return (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => {
                if (next === true) {
                  onChange([...value, option.id]);
                } else {
                  onChange(value.filter((id) => id !== option.id));
                }
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function StaffCreateForm() {
  const router = useRouter();
  const mutation = useStaffCreateMutation();
  const { activeYear, activeYearId } = useActiveAcademicYear();
  const { data: roles = [] } = useUserRoleOptions();

  const staffRoles = roles.filter((r) => STAFF_ROLE_SLUGS.has(r.slug.toLowerCase()));
  const defaultRoleId =
    staffRoles.find((r) => r.slug.toLowerCase() === 'teacher')?.id ??
    staffRoles[0]?.id ??
    '';

  const form = useForm<StaffCreateFormValues, unknown, StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: {
      title: 'Mr',
      employmentType: 'FULL_TIME',
      isActive: true,
      roleId: defaultRoleId,
      phoneCountry: DEFAULT_COUNTRY_NAME,
      emergencyContactPhoneCountry: DEFAULT_COUNTRY_NAME,
      nationality: 'Cameroonian',
      subSystem: 'ENGLISH',
      subjectIds: [],
      classIds: [],
      academicYearId: '',
    },
  });

  const watchedSubSystem = form.watch('subSystem') as AcademicSubSystem;
  const { data: allSubjects = [] } = useSubjectOptions(activeYearId);
  const { data: classOptions = [] } = useClassesForFilters({
    subSystem: watchedSubSystem,
  });

  const subjectOptions = useMemo(
    () =>
      allSubjects
        .filter(
          (subject) =>
            !subject.subSystem || subject.subSystem === watchedSubSystem,
        )
        .map((s) => ({
          id: s.id,
          label: `${s.code} — ${s.nameEn}`,
        })),
    [allSubjects, watchedSubSystem],
  );

  const classSelectOptions = useMemo(
    () =>
      (classOptions as { id: string; name: string }[]).map((c) => ({
        id: c.id,
        label: c.name,
      })),
    [classOptions],
  );

  useEffect(() => {
    if (defaultRoleId) {
      form.setValue('roleId', defaultRoleId, { shouldDirty: false });
    }
  }, [defaultRoleId, form]);

  useEffect(() => {
    if (activeYearId) {
      form.setValue('academicYearId', activeYearId, { shouldDirty: false });
    }
  }, [activeYearId, form]);

  useEffect(() => {
    form.setValue('subjectIds', [], { shouldDirty: true });
    form.setValue('classIds', [], { shouldDirty: true });
  }, [watchedSubSystem, form]);

  async function onSubmit(values: StaffCreateInput) {
    if (!activeYearId) {
      toast.error('Set an active academic year before adding a teacher.');
      return;
    }

    const payload: StaffCreateInput = {
      ...values,
      academicYearId: activeYearId,
    };

    const result = await mutation.mutateAsync(payload).catch((err: Error) => {
      toast.error(err.message ?? 'Failed to create teacher.');
      return null;
    });

    if (!result) return;

    const signInUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/signin`
        : '/signin';

    downloadStaffCredentials({
      staffCode: result.staffCode,
      loginEmail: result.loginEmail,
      temporaryPassword: result.temporaryPassword,
      signInUrl,
    });

    toast.success(
      `Teacher ${result.staffCode} created. Login credentials downloaded.`,
    );
    router.push(`/staff/${result.staffId}`);
  }

  const noActiveYear = !activeYearId;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {noActiveYear ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            No active academic year is configured. Assignments cannot be saved until
            one is set.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Assignments apply to academic year{' '}
            <span className="font-medium text-foreground">
              {activeYear?.label ?? activeYearId}
            </span>
            . A system login email will be generated when you save.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={ROW_4}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select title" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TITLE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First name <span className="text-destructive">*</span>
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
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Last name <span className="text-destructive">*</span>
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
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="Pick date of birth"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <div className={ROW_3}>
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="idNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Card Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className={GRID}>
            <FormField
              control={form.control}
              name="personalEmail"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    Email address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Personal or contact email. Login email is generated automatically
                    (firstname.lastname@acadia-college.edu).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PhoneFormFields
              control={form.control}
              countryName="phoneCountry"
              phoneName="phone"
              phoneLabel="Phone number"
              required
              hideCountry
              className="sm:col-span-2 lg:col-span-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address &amp; Qualifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={ROW_3}>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <CityAutocomplete
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        country={DEFAULT_COUNTRY_NAME}
                        region={form.watch('region')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <RegionSelect
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        country={DEFAULT_COUNTRY_NAME}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teachingExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teaching experience</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teaching Assignment &amp; Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={ROW_4}>
              <FormField
                control={form.control}
                name="subSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Sub-system <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-system" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACADEMIC_SUB_SYSTEMS.map((sys) => (
                          <SelectItem key={sys} value={sys}>
                            {subSystemLabel(sys)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Employment type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {staffEmploymentLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Pick start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly salary</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="subjectIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjects to teach</FormLabel>
                    <CheckboxMultiSelect
                      options={subjectOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={noActiveYear}
                      emptyMessage="No subjects available for this sub-system."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classes to teach</FormLabel>
                    <CheckboxMultiSelect
                      options={classSelectOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={noActiveYear}
                      emptyMessage="No classes available for this sub-system."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">Emergency contact</p>
              <div className={GRID}>
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELATIONSHIP_OPTIONS.map((rel) => (
                            <SelectItem key={rel.value} value={rel.value}>
                              {rel.label}
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
                  hideCountry
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/staff')}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || noActiveYear}>
            {mutation.isPending ? 'Creating…' : 'Create teacher'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
