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
import {
  ACADEMIC_SUB_SYSTEMS,
  type AcademicSubSystem,
} from '@/lib/acadia/education-system';
import { downloadStaffCredentials } from '@/lib/acadia/download-credentials';
import { useStaffCreateMutation } from '@/hooks/use-staff-create-mutation';
import { useSubjectOptions } from '@/hooks/use-subject-catalog-options';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
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
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: 'Cameroonian',
      idNumber: '',
      personalEmail: '',
      phoneCountry: DEFAULT_COUNTRY_NAME,
      phone: '',
      address: '',
      city: '',
      region: '',
      qualifications: '',
      teachingExperience: '',
      employmentType: 'FULL_TIME',
      isActive: true,
      roleId: defaultRoleId,
      emergencyContactPhoneCountry: DEFAULT_COUNTRY_NAME,
      emergencyContactPhone: '',
      emergencyContactName: '',
      subSystem: 'ENGLISH',
      subjectIds: [],
      classIds: [],
      academicYearId: '',
      hireDate: '',
      staffCode: '',
      departmentId: '',
      bio: '',
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
      toast.error(t('staff.noActiveYear'));
      return;
    }

    const payload: StaffCreateInput = {
      ...values,
      academicYearId: activeYearId,
    };

    const result = await mutation.mutateAsync(payload).catch((err: Error) => {
      toast.error(err.message ?? t('staff.createFailed'));
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
      t('staff.createdToast', { staffCode: result.staffCode }),
    );
    router.push(`/staff/${result.staffId}`);
  }

  const noActiveYear = !activeYearId;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {noActiveYear ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t('staff.noActiveYearBanner')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('staff.assignmentsApplyTo', {
              year: activeYear?.label ?? activeYearId,
            })}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('staff.personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={ROW_4}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('common.labels.title')} <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('staff.selectTitle')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TITLE_OPTIONS.map((titleOption) => (
                        <SelectItem key={titleOption} value={titleOption}>
                          {titleOption}
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
                    {t('students.firstName')} <span className="text-destructive">*</span>
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
                    {t('students.lastName')} <span className="text-destructive">*</span>
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
                  <FormLabel>{t('common.labels.dateOfBirth')}</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('staff.pickDateOfBirth')}
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
                  <FormLabel>{t('common.labels.gender')}</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('students.selectGender')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('common.labels.male')}</SelectItem>
                      <SelectItem value="female">{t('common.labels.female')}</SelectItem>
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
                  <FormLabel>{t('students.nationality')}</FormLabel>
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
                  <FormLabel>{t('staff.idCardNumber')}</FormLabel>
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
            <CardTitle>{t('staff.contactDetails')}</CardTitle>
          </CardHeader>
          <CardContent className={GRID}>
            <FormField
              control={form.control}
              name="personalEmail"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    {t('staff.emailAddress')} <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('staff.emailLoginHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PhoneFormFields
              control={form.control}
              countryName="phoneCountry"
              phoneName="phone"
              phoneLabel={t('staff.phoneNumber')}
              required
              hideCountry
              className="sm:col-span-2 lg:col-span-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('staff.addressQualifications')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={ROW_3}>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.labels.address')}</FormLabel>
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
                    <FormLabel>{t('common.labels.city')}</FormLabel>
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
                    <FormLabel>{t('common.labels.region')}</FormLabel>
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
                    <FormLabel>{t('staff.qualifications')}</FormLabel>
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
                    <FormLabel>{t('staff.teachingExperience')}</FormLabel>
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
            <CardTitle>{t('staff.teachingAssignment')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={ROW_4}>
              <FormField
                control={form.control}
                name="subSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('catalog.subSystemLabel')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('catalog.selectSubSystem')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACADEMIC_SUB_SYSTEMS.map((sys) => (
                          <SelectItem key={sys} value={sys}>
                            {t(`catalog.subSystem.${sys}`)}
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
                      {t('staff.employmentType')} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('staff.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`staff.employment.${type}`)}
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
                    <FormLabel>{t('staff.startDate')}</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder={t('staff.pickStartDate')}
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
                    <FormLabel>{t('staff.monthlySalary')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const next = event.target.value;
                          field.onChange(next === '' ? undefined : next);
                        }}
                      />
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
                    <FormLabel>{t('staff.subjectsToTeach')}</FormLabel>
                    <CheckboxMultiSelect
                      options={subjectOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={noActiveYear}
                      emptyMessage={t('staff.noSubjectsForSubSystem')}
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
                    <FormLabel>{t('staff.classesToTeach')}</FormLabel>
                    <CheckboxMultiSelect
                      options={classSelectOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={noActiveYear}
                      emptyMessage={t('staff.noClassesForSubSystem')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">{t('staff.emergencyContact')}</p>
              <div className={GRID}>
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.labels.name')}</FormLabel>
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
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('students.selectRelationship')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELATIONSHIP_OPTIONS.map((rel) => (
                            <SelectItem key={rel.value} value={rel.value}>
                              {t(`staff.relationship.${rel.value}`)}
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
            {t('common.buttons.cancel')}
          </Button>
          <Button type="submit" disabled={mutation.isPending || noActiveYear}>
            {mutation.isPending ? t('common.messages.creating') : t('staff.createTeacher')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
