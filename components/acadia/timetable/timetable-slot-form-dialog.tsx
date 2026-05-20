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
import { useAcademicYearOptions } from '@/hooks/use-academic-calendar-options';
import {
  staffDisplayLabel,
  useSubjectOptions,
  useRoomOptions,
  useStaffOptions,
} from '@/hooks/use-subject-catalog-options';
import { useSubjectMutations } from '@/hooks/use-subject-mutations';

export type TimetableSlotRecord = {
  id: string;
  academicYearId: string;
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TimetableSlotRecord | null;
  defaultSubjectId?: string;
}) {
  const isEdit = !!record;
  const { createTimetableSlot, updateTimetableSlot } = useSubjectMutations();
  const { data: years = [] } = useAcademicYearOptions();
  const { data: staff = [] } = useStaffOptions();
  const { data: rooms = [] } = useRoomOptions();

  const form = useForm<TimetableSlotFormValues>({
    resolver: zodResolver(timetableSlotSchema),
    defaultValues: {
      academicYearId: '',
      subjectId: defaultSubjectId ?? '',
      staffProfileId: '',
      roomId: '',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '09:00',
    },
  });

  const academicYearId = form.watch('academicYearId');
  const { data: subjects = [] } = useSubjectOptions(academicYearId);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.reset({
        academicYearId: record.academicYearId,
        subjectId: record.subjectId,
        staffProfileId: record.staffProfileId,
        roomId: record.roomId,
        dayOfWeek: record.dayOfWeek,
        startTime: minutesToTimeString(record.startMinutes),
        endTime: minutesToTimeString(record.endMinutes),
      });
    } else {
      const currentYear = years.find((y) => y.isCurrent);
      form.reset({
        academicYearId: currentYear?.id ?? '',
        subjectId: defaultSubjectId ?? '',
        staffProfileId: '',
        roomId: '',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00',
      });
    }
  }, [open, record, years, defaultSubjectId, form]);

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
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue('subjectId', '');
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.label}
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
                    <FormLabel>Subject</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
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
                      <FormLabel>Teacher</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staff.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {staffDisplayLabel(member)}
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
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
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
