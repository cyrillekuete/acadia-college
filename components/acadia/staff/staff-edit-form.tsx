'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/acadia/forms/date-picker-input';
import { PhoneFormFields } from '@/components/acadia/phone/phone-form-field';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import { splitPhoneE164 } from '@/lib/acadia/phone';
import {
  staffUpdateSchema,
  staffEmploymentTypeEnum,
  staffEmergencyRelationshipEnum,
  staffTitleEnum,
  type StaffUpdateFormValues,
  type StaffUpdateInput,
} from '@/lib/acadia/staff-create-schemas';
import { useStaffMutations } from '@/hooks/use-staff-mutations';
import { useTranslation } from '@/hooks/useTranslation';

export type StaffEditRecord = {
  profileId: string;
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

function toFormValues(staff: StaffEditRecord): StaffUpdateFormValues {
  const phone = splitPhoneE164(staff.phone);
  const officePhone = splitPhoneE164(staff.officePhone);
  const emergencyPhone = splitPhoneE164(staff.emergencyContactPhone);
  const title = staffTitleEnum.safeParse(staff.title);
  const employment = staffEmploymentTypeEnum.safeParse(staff.employmentType);
  const relationship = staffEmergencyRelationshipEnum.safeParse(
    staff.emergencyContactRelationship,
  );

  return {
    title: title.success ? title.data : 'Mr',
    firstName: staff.firstName ?? '',
    lastName: staff.lastName ?? '',
    personalEmail: staff.personalEmail ?? '',
    phoneCountry: phone.countryName || DEFAULT_COUNTRY_NAME,
    phone: phone.nationalNumber,
    address: staff.address ?? '',
    city: staff.city ?? '',
    region: staff.region ?? '',
    qualifications: staff.qualifications ?? '',
    teachingExperience: staff.teachingExperience ?? '',
    employmentType: employment.success ? employment.data : 'FULL_TIME',
    hireDate: staff.hireDate?.slice(0, 10) ?? '',
    monthlySalary: staff.monthlySalary ?? undefined,
    emergencyContactName: staff.emergencyContactName ?? '',
    emergencyContactRelationship: relationship.success
      ? relationship.data
      : undefined,
    emergencyContactPhoneCountry:
      emergencyPhone.countryName || DEFAULT_COUNTRY_NAME,
    emergencyContactPhone: emergencyPhone.nationalNumber,
    bio: staff.bio ?? '',
    officeRoom: staff.officeRoom ?? '',
    officePhoneCountry: officePhone.countryName || DEFAULT_COUNTRY_NAME,
    officePhone: officePhone.nationalNumber,
    departmentId: staff.departmentId ?? '',
    isActive: staff.isActive,
  };
}

export function StaffEditForm({ staff }: { staff: StaffEditRecord }) {
  const { t } = useTranslation();
  const { updateStaff } = useStaffMutations();

  const form = useForm<StaffUpdateFormValues, unknown, StaffUpdateInput>({
    resolver: zodResolver(staffUpdateSchema),
    defaultValues: toFormValues(staff),
  });

  useEffect(() => {
    form.reset(toFormValues(staff));
  }, [staff, form]);

  const onSubmit = (values: StaffUpdateInput) => {
    updateStaff.mutate({ profileId: staff.profileId, values });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>{t('staff.staffCode')}</FormLabel>
          <FormControl>
            <Input value={staff.staffCode ?? ''} readOnly className="bg-muted" />
          </FormControl>
        </FormItem>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('common.labels.title')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('staff.selectTitle')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staffTitleEnum.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
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
                <FormLabel>{t('students.firstName')}</FormLabel>
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
                <FormLabel>{t('students.lastName')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="personalEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('staff.contactEmail')}</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <PhoneFormFields
          control={form.control}
          phoneName="phone"
          countryName="phoneCountry"
          phoneLabel={t('staff.mobilePhone')}
          required
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
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
                  <Input {...field} />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('staff.employmentType')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('staff.selectType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staffEmploymentTypeEnum.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`staff.employment.${option}`)}
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
                    value={field.value || undefined}
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
                    value={field.value ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      field.onChange(raw === '' ? undefined : Number(raw));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="officeRoom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('staff.officeRoom')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('staff.officeRoomPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <PhoneFormFields
          control={form.control}
          phoneName="officePhone"
          countryName="officePhoneCountry"
          phoneLabel={t('staff.officePhone')}
        />

        <FormField
          control={form.control}
          name="qualifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('staff.qualifications')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
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
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('staff.shortBio')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">{t('staff.emergencyContact')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
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
                      {staffEmergencyRelationshipEnum.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`staff.relationship.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <PhoneFormFields
            control={form.control}
            phoneName="emergencyContactPhone"
            countryName="emergencyContactPhoneCountry"
            phoneLabel={t('staff.contactPhone')}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>{t('staff.activeStatus')}</FormLabel>
                <p className="text-xs text-muted-foreground">
                  {t('staff.deactivateHint')}
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateStaff.isPending}>
          {updateStaff.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : null}
          {t('common.buttons.save')}
        </Button>
      </form>
    </Form>
  );
}
