'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { LoaderCircleIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  timetableSlotSchema,
  type TimetableSlotFormValues,
} from '@/lib/acadia/subject-schemas';
import { DAY_OF_WEEK_LABELS, minutesToTimeString } from '@/lib/acadia/timetable';
import { CurrentAcademicYearBadge } from '@/components/acadia/academics/current-academic-year-badge';
import { useActiveAcademicYear } from '@/components/acadia/academics/academic-year-provider';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';
import {
  staffDisplayLabel,
  useClassSubjectOptions,
  useRoomOptions,
  useSubjectTeacherOptions,
} from '@/hooks/use-subject-catalog-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

export type TimetableSlotRecord = {
  id: string;
  academicYearId: string;
  classId: string | null;
  subjectId: string;
  staffProfileId: string;
  roomId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

export function TimetableSlotFormDialog({
  open,
  onOpenChange,
  record,
  defaultSubjectId,
  defaultClassId,
  defaultDayOfWeek,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TimetableSlotRecord | null;
  defaultSubjectId?: string;
  defaultClassId?: string;
  defaultDayOfWeek?: number;
}) {
  const isEdit = !!record;
  const { createTimetableSlot, updateTimetableSlot } = useSubjectMutations();
  const { activeYearId } = useActiveAcademicYear();
  const { data: classes = [] } = useClassesForFilters();
  const { data: rooms = [] } = useRoomOptions();

  const form = useForm<TimetableSlotFormValues>({
    resolver: zodResolver(timetableSlotSchema),
    defaultValues: {
      academicYearId: '',
      classId: '',
      subjectId: '',
      staffProfileId: '',
      roomId: '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '09:00',
    },
  });

  const academicYearId = form.watch('academicYearId') || activeYearId || '';
  const classId = form.watch('classId');
  const subjectId = form.watch('subjectId');
  const staffProfileId = form.watch('staffProfileId');

  const { data: subjects = [], isLoading: subjectsLoading } =
    useClassSubjectOptions(classId);
  const { data: teachers = [], isLoading: teachersLoading } =
    useSubjectTeacherOptions(subjectId, academicYearId);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: record.academicYearId,
        classId: record.classId ?? '',
        subjectId: record.subjectId,
        staffProfileId: record.staffProfileId,
        roomId: record.roomId,
        dayOfWeek: record.dayOfWeek,
        startTime: minutesToTimeString(record.startMinutes),
        endTime: minutesToTimeString(record.endMinutes),
      });
    } else {
      form.reset({
        academicYearId: activeYearId ?? '',
        classId: defaultClassId ?? '',
        subjectId: defaultSubjectId ?? '',
        staffProfileId: '',
        roomId: '',
        dayOfWeek: defaultDayOfWeek ?? 1,
        startTime: '08:00',
        endTime: '09:00',
      });
    }
  }, [
    open,
    record,
    activeYearId,
    defaultSubjectId,
    defaultClassId,
    defaultDayOfWeek,
    form,
  ]);

  useEffect(() => {
    if (!open || !subjectId || subjectsLoading) {
      return;
    }
    if (!subjects.some((subject) => subject.id === subjectId)) {
      form.setValue('subjectId', '');
      form.setValue('staffProfileId', '');
    }
  }, [open, subjectId, subjects, subjectsLoading, form]);

  useEffect(() => {
    if (!open || !staffProfileId) {
      return;
    }
    if (!teachers.some((teacher) => teacher.id === staffProfileId)) {
      form.setValue('staffProfileId', '');
    }
  }, [open, staffProfileId, teachers, form]);

  const pending =
    createTimetableSlot.isPending || updateTimetableSlot.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && record) {
      await updateTimetableSlot.mutateAsync({ id: record.id, values });
    } else {
      await createTimetableSlot.mutateAsync(values);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit timetable slot' : 'New timetable slot'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form id="timetable-slot-form" onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="academicYearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic year</FormLabel>
                    <CurrentAcademicYearBadge className="mb-2" />
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Class <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subjectId', '');
                        form.setValue('staffProfileId', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((classRow) => (
                          <SelectItem key={classRow.id} value={classRow.id}>
                            {classRow.name}
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
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Subject <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('staffProfileId', '');
                      }}
                      disabled={!classId || subjectsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              classId
                                ? subjectsLoading
                                  ? 'Loading subjects…'
                                  : 'Select subject'
                                : 'Select a class first'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.code} — {subject.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {classId && !subjectsLoading && subjects.length === 0 ? (
                      <FormDescription>
                        No subjects are assigned to this class yet. Assign subjects on
                        the class or subject page first.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="staffProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Teacher <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!subjectId || teachersLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                subjectId
                                  ? teachersLoading
                                    ? 'Loading teachers…'
                                    : 'Select teacher'
                                  : 'Select a subject first'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teachers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {staffDisplayLabel(member)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subjectId && !teachersLoading && teachers.length === 0 ? (
                        <FormDescription>
                          No teachers are assigned to this subject for the active year.
                        </FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Room <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.code} — {room.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DAY_OF_WEEK_LABELS).map(([day, label]) => (
                          <SelectItem key={day} value={day}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="submit" form="timetable-slot-form" disabled={pending}>
            {pending ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            {isEdit ? 'Save slot' : 'Create slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
