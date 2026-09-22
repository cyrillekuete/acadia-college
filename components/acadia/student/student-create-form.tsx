'use client';

import { useEffect, useMemo, useState, type ComponentProps, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { DobTextInput } from '@/components/acadia/forms/dob-text-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RegistryCreateWizardShell,
  StepperContent,
} from '@/components/acadia/registry/registry-create-wizard-shell';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  STUDENT_CREATE_STEP_FIELDS,
  studentCreateSchema,
  type StudentCreateInput,
  type StudentCreateFormValues,
} from '@/lib/acadia/student-create-schemas';
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
import { PhoneFieldGroup } from '@/components/acadia/phone/phone-field-group';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import {
  CREDENTIALS_DOWNLOAD_NAVIGATION_DELAY_MS,
  downloadFamilyCredentials,
} from '@/lib/acadia/download-credentials';
import { isCityValidForLocation } from '@/lib/acadia/locations';
import { useTranslation } from '@/hooks/useTranslation';

const SECTION_GRID =
  'grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-center';

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
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useStudentCreateMutation();
  const { activeYear, activeYearId } = useActiveAcademicYear();

  const form = useForm<StudentCreateFormValues, unknown, StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: undefined,
      place_of_birth: '',
      nationality: 'Cameroonian',
      religion: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      region: '',
      is_new_student: true,
      override_enrollment_window: false,
      country: DEFAULT_COUNTRY_NAME,
      phone_country: DEFAULT_COUNTRY_NAME,
      parent_phone_country: DEFAULT_COUNTRY_NAME,
      emergency_contact_phone_country: DEFAULT_COUNTRY_NAME,
      parent_name: '',
      parent_email: '',
      parent_phone: '',
      parent_address: '',
      parent_occupation: '',
      parent_relationship: 'father',
      academic_year: '',
      academic_year_id: '',
      level_id: '',
      class_id: '',
      class_name: '',
      previous_school: '',
      previous_class: '',
      enrollment_date: '',
      matricule_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      blood_group: '',
      allergies: '',
      medical_conditions: '',
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

  const [activeStep, setActiveStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [focusField, setFocusField] = useState<keyof StudentCreateFormValues | null>(
    null,
  );
  const stepCount = 5;

  useEffect(() => {
    if (!focusField) return;
    form.setFocus(focusField);
    setFocusField(null);
  }, [focusField, form]);

  async function onSubmit() {
    if (activeStep !== stepCount) {
      return;
    }

    const result = await mutation.mutateAsync(form.getValues()).catch((err: Error) => {
      const message = err.message;
      toast.error(
        message ? t(message, { defaultValue: message }) : t('students.createFailed'),
      );
      return null;
    });

    if (!result) return;

    const signInUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/signin`
        : '/signin';

    downloadFamilyCredentials({
      studentId: result.studentId,
      studentLoginEmail: result.studentLoginEmail,
      studentTemporaryPassword: result.studentTemporaryPassword,
      parentCode: result.parentCode,
      parentLoginEmail: result.parentLoginEmail,
      parentTemporaryPassword: result.parentTemporaryPassword,
      signInUrl,
    });

    toast.success(
      t('students.createdToast', {
        studentId: result.studentId,
      }),
    );
    if (result.feeWarning) {
      toast.warning(
        t('students.feeAccountSkipped', { message: result.feeWarning }),
      );
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, CREDENTIALS_DOWNLOAD_NAVIGATION_DELAY_MS);
    });
    router.push(`/students/${result.studentProfileId}`);
  }

  const wizardSteps = useMemo(
    () => [
      {
        id: 1,
        title: t('students.identity'),
        description: t('students.createWizard.step1Description'),
        panelTitle: t('students.createWizard.step1PanelTitle'),
        panelDescription: t('students.createWizard.step1PanelDescription'),
      },
      {
        id: 2,
        title: t('students.contactInfo'),
        description: t('students.createWizard.step2Description'),
        panelTitle: t('students.createWizard.step2PanelTitle'),
        panelDescription: t('students.createWizard.step2PanelDescription'),
      },
      {
        id: 3,
        title: t('students.academicInfo'),
        description: t('students.createWizard.step3Description'),
        panelTitle: t('students.createWizard.step3PanelTitle'),
        panelDescription: t('students.createWizard.step3PanelDescription'),
      },
      {
        id: 4,
        title: t('students.parentGuardian'),
        description: t('students.createWizard.step4Description'),
        panelTitle: t('students.createWizard.step4PanelTitle'),
        panelDescription: t('students.createWizard.step4PanelDescription'),
      },
      {
        id: 5,
        title: t('students.emergencyMedical'),
        description: t('students.createWizard.step5Description'),
        panelTitle: t('students.createWizard.step5PanelTitle'),
        panelDescription: t('students.createWizard.step5PanelDescription'),
      },
    ],
    [t],
  );

  async function handleContinue() {
    const fields = STUDENT_CREATE_STEP_FIELDS[activeStep];
    if (fields?.length) {
      const ok = await form.trigger(fields);
      if (!ok) {
        const firstInvalid = fields.find((name) => form.getFieldState(name).invalid);
        if (firstInvalid) {
          form.setFocus(firstInvalid);
        }
        return;
      }
    }
    const next = Math.min(stepCount, activeStep + 1);
    setActiveStep(next);
    setMaxStepReached((prev) => Math.max(prev, next));
  }

  function onInvalid(errors: FieldErrors<StudentCreateFormValues>) {
    for (const [stepId, fields] of Object.entries(STUDENT_CREATE_STEP_FIELDS)) {
      const firstInvalid = fields.find((name) => errors[name]);
      if (!firstInvalid) continue;

      const step = Number(stepId);
      setActiveStep(step);
      setMaxStepReached((prev) => Math.max(prev, step));
      setFocusField(firstInvalid);

      const fieldError = errors[firstInvalid];
      const message =
        fieldError && 'message' in fieldError && typeof fieldError.message === 'string'
          ? fieldError.message
          : undefined;
      if (message) {
        toast.error(t(message, { defaultValue: message }));
      }
      return;
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (activeStep !== stepCount) {
      event.preventDefault();
      void handleContinue();
      return;
    }
    void form.handleSubmit(onSubmit, onInvalid)(event);
  }

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit}>
        <RegistryCreateWizardShell
          steps={wizardSteps}
          activeStep={activeStep}
          maxStepReached={maxStepReached}
          onStepChange={setActiveStep}
          backHref="/students"
          backToListLabel={t('students.createWizard.backToStudents')}
          stepBackLabel={t('common.buttons.back')}
          cancelLabel={t('common.buttons.cancel')}
          continueLabel={t('students.createWizard.continue')}
          submitLabel={
            mutation.isPending ? t('common.messages.creating') : t('students.createStudent')
          }
          onBack={() => setActiveStep((s) => Math.max(1, s - 1))}
          onContinue={() => void handleContinue()}
          onCancel={() => router.push('/students')}
          isLastStep={activeStep === stepCount}
          isSubmitting={mutation.isPending}
        >
          <StepperContent value={1} className={SECTION_GRID}>
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.firstName')} <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="last_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.lastName')} <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="date_of_birth" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.dateOfBirth')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <DobTextInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('common.placeholders.dob')}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="gender" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.gender')}</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('students.selectGender')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('common.labels.male')}</SelectItem>
                      <SelectItem value="female">{t('common.labels.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="place_of_birth" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.placeOfBirth')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="nationality" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.nationality')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="religion" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.religion')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />
          </StepperContent>

          <StepperContent value={2} className={ROW_GRID_2}>
            <FormField control={form.control} name="email" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.email')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" type="email" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="country" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.country')}</StudentFieldLabel>
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

            <FormField control={form.control} name="phone" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.phone')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <PhoneFieldGroup
                      country={form.watch('phone_country') ?? ''}
                      onCountryChange={() => {}}
                      phone={field.value ?? ''}
                      onPhoneChange={field.onChange}
                      hideCountry
                      hideLabel
                      phoneId={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="address" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.address')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="region" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.region')}</StudentFieldLabel>
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
                <StudentFieldLabel>{t('common.labels.city')}</StudentFieldLabel>
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
          </StepperContent>

          <StepperContent value={3} className={SECTION_GRID}>
            <FormField control={form.control} name="subsystem" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('catalog.subSystemLabel')}</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('catalog.selectSubSystem')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="english">{t('catalog.subSystem.ENGLISH')}</SelectItem>
                      <SelectItem value="french">{t('catalog.subSystem.FRENCH')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="branch" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('catalog.branchLabel')}</StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('catalog.selectBranch')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="grammar">{t('catalog.branch.GRAMMAR')}</SelectItem>
                      <SelectItem value="technical">{t('catalog.branch.TECHNICAL')}</SelectItem>
                      <SelectItem value="commercial">{t('catalog.branch.COMMERCIAL')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="academic_year" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.academicYear')}</StudentFieldLabel>
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
                <StudentFieldLabel>{t('students.level')} <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={!catalogSubSystem || !catalogBranch}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('students.selectLevel')} />
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
                <StudentFieldLabel>{t('students.class')}</StudentFieldLabel>
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
                        <SelectValue placeholder={t('students.selectClassOptional')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t('students.autoAssignIfUnique')}</SelectItem>
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
                <StudentFieldLabel>{t('students.previousSchool')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="previous_class" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.previousClass')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="enrollment_date" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.enrollmentDate')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="matricule_number" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('students.matriculeOptional')}</StudentFieldLabel>
                <StudentFieldControl>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Input
                          className="w-full"
                          placeholder={t('students.matriculePlaceholder')}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t('students.matriculeHint')}
                    </TooltipContent>
                  </Tooltip>
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
                    {t('students.newStudentCheckbox')}
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="override_enrollment_window"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3 space-y-0 sm:col-span-2 lg:col-span-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="font-normal leading-none">
                    {t('students.overrideEnrollmentWindow')}
                  </FormLabel>
                </FormItem>
              )}
            />
          </StepperContent>

          <StepperContent value={4} className={ROW_GRID_2}>
            <FormField control={form.control} name="parent_name" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.fullName')} <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_relationship" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.relationship')} <span className="text-destructive">*</span></StudentFieldLabel>
                <StudentFieldControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('students.selectRelationship')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="father">{t('students.relationship.father')}</SelectItem>
                      <SelectItem value="mother">{t('students.relationship.mother')}</SelectItem>
                      <SelectItem value="guardian">{t('students.relationship.guardian')}</SelectItem>
                      <SelectItem value="other">{t('students.relationship.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_email" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.email')}</StudentFieldLabel>
                <StudentFieldControl>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Input className="w-full" type="email" {...field} />
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t('students.parentEmailHint')}
                    </TooltipContent>
                  </Tooltip>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_occupation" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.occupation')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_address" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.address')}</StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl><Input className="w-full" {...field} /></FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />

            <FormField control={form.control} name="parent_phone_country" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>{t('common.labels.country')}</StudentFieldLabel>
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

            <FormField control={form.control} name="parent_phone" render={({ field }) => (
              <StudentFieldItem>
                <StudentFieldLabel>
                  {t('common.labels.phone')} <span className="text-destructive">*</span>
                </StudentFieldLabel>
                <StudentFieldControl>
                  <FormControl>
                    <PhoneFieldGroup
                      country={form.watch('parent_phone_country') ?? ''}
                      onCountryChange={() => {}}
                      phone={field.value ?? ''}
                      onPhoneChange={field.onChange}
                      required
                      hideCountry
                      hideLabel
                      phoneId={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </StudentFieldControl>
              </StudentFieldItem>
            )} />
          </StepperContent>

          <StepperContent value={5} className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('students.emergencyContact')}</h3>
              <div className={ROW_GRID_2}>
                <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('students.contactName')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />

                <FormField control={form.control} name="emergency_contact_relationship" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('common.labels.relationship')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />

                <FormField control={form.control} name="emergency_contact_phone_country" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('common.labels.country')}</StudentFieldLabel>
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

                <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('common.labels.phone')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl>
                        <PhoneFieldGroup
                          country={form.watch('emergency_contact_phone_country') ?? ''}
                          onCountryChange={() => {}}
                          phone={field.value ?? ''}
                          onPhoneChange={field.onChange}
                          hideCountry
                          hideLabel
                          phoneId={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('students.medicalInformation')}</h3>
              <div className={ROW_GRID_2}>
                <FormField control={form.control} name="blood_group" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('students.bloodGroup')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl><Input className="w-full" placeholder={t('students.bloodGroupPlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />

                <FormField control={form.control} name="allergies" render={({ field }) => (
                  <StudentFieldItem>
                    <StudentFieldLabel>{t('students.allergies')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl><Input className="w-full" placeholder={t('students.allergiesPlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />

                <FormField control={form.control} name="medical_conditions" render={({ field }) => (
                  <StudentFieldItem className="sm:col-span-2">
                    <StudentFieldLabel>{t('students.medicalConditions')}</StudentFieldLabel>
                    <StudentFieldControl>
                      <FormControl><Input className="w-full" placeholder={t('students.conditionsPlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </StudentFieldControl>
                  </StudentFieldItem>
                )} />
              </div>
            </div>
          </StepperContent>
        </RegistryCreateWizardShell>
      </form>
    </Form>
  );
}
