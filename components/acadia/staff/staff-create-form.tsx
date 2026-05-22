'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PhoneFormFields } from '@/components/acadia/phone/phone-form-field';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import {
  staffCreateSchema,
  type StaffCreateInput,
  type StaffCreateFormValues,
} from '@/lib/acadia/staff-create-schemas';
import { staffEmploymentLabel } from '@/lib/acadia/staff-registry';
import { useStaffCreateMutation } from '@/hooks/use-staff-create-mutation';
import { requireBrowserClient } from '@/lib/supabase/client';
import { fetchDepartmentOptions } from '@/lib/supabase/queries/staff-list';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { useUserRoleOptions } from '@/hooks/use-user-role-options';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'ADJUNCT', 'VISITING'] as const;
const STAFF_ROLE_SLUGS = new Set(['teacher', 'lecturer', 'staff']);
const ALL = '__none__';

export function StaffCreateForm() {
  const router = useRouter();
  const mutation = useStaffCreateMutation();
  const { data: session, isLoading: sessionLoading, isError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;
  const { data: roles = [] } = useUserRoleOptions();

  const { data: departments = [] } = useQuery({
    queryKey: ['department-options', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('Tenant context is required');
      }
      const supabase = requireBrowserClient();
      return fetchDepartmentOptions(supabase, tenantId);
    },
    enabled: isAcadiaTenantQueryEnabled(sessionLoading, isError, session, tenantId),
  });

  const staffRoles = roles.filter((r) => STAFF_ROLE_SLUGS.has(r.slug.toLowerCase()));
  const defaultRoleId =
    staffRoles.find((r) => r.slug.toLowerCase() === 'teacher')?.id ??
    staffRoles[0]?.id ??
    '';

  const form = useForm<StaffCreateFormValues, unknown, StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: {
      employmentType: 'FULL_TIME',
      isActive: true,
      roleId: defaultRoleId,
      officePhoneCountry: DEFAULT_COUNTRY_NAME,
    },
  });

  async function onSubmit(values: StaffCreateInput) {
    const result = await mutation.mutateAsync(values).catch((err: Error) => {
      toast.error(err.message ?? 'Failed to create staff.');
      return null;
    });

    if (!result) return;

    toast.success(
      `Staff ${result.staffCode} created. A password-setup email was sent to ${values.email}.`,
    );
    router.push(`/staff/${result.staffId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Full name <span className="text-destructive">*</span>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used for login; a password-setup link will be emailed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {staffRoles.length > 1 ? (
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value || defaultRoleId}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="staffCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-generated if empty" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Teacher" {...field} />
                  </FormControl>
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
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    value={field.value || ALL}
                    onValueChange={(value) =>
                      field.onChange(value === ALL ? '' : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ALL}>No department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
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
                  <FormLabel>Hire date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2 lg:col-span-1">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive staff are hidden from active assignments.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Office &amp; bio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PhoneFormFields
              control={form.control}
              countryName="officePhoneCountry"
              phoneName="officePhone"
              phoneLabel="Office phone"
            />

            <FormField
              control={form.control}
              name="officeRoom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office room</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create staff'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
