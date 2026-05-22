'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, FileText, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AcademicBranch, AcademicSubSystem } from '@/lib/acadia/education-system';
import { useEnrollmentMutations } from '@/hooks/use-enrollment-mutations';
import { useClassesForFilters } from '@/hooks/use-enrollment-catalog-options';

type ReviewErrorPayload = {
  message?: string;
  candidateClassIds?: string[];
};

export function ApplicationReviewActions({
  applicationId,
  status,
  levelId,
  subSystem,
  branch,
}: {
  applicationId: string;
  status: string;
  levelId?: string;
  subSystem?: AcademicSubSystem | string;
  branch?: AcademicBranch | string;
}) {
  const { reviewApplication } = useEnrollmentMutations();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [candidateClassIds, setCandidateClassIds] = useState<string[]>([]);
  const [classPickerMessage, setClassPickerMessage] = useState('');

  const { data: classOptions = [] } = useClassesForFilters({
    subSystem: (subSystem as AcademicSubSystem) ?? null,
    branch: (branch as AcademicBranch) ?? null,
    levelId: levelId ?? null,
  });

  const classChoices =
    candidateClassIds.length > 0
      ? classOptions.filter((c) => candidateClassIds.includes(c.id))
      : classOptions;

  if (status !== 'PENDING') {
    if (status === 'APPROVED') {
      return (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/enrollment/applications/${applicationId}/confirmation`}>
            <FileText className="size-4" />
            View confirmation
          </Link>
        </Button>
      );
    }
    return null;
  }

  const submitApprove = (classId?: string) => {
    reviewApplication.mutate(
      {
        id: applicationId,
        input: classId
          ? { decision: 'approve', classId }
          : { decision: 'approve' },
      },
      {
        onSuccess: () => {
          setClassPickerOpen(false);
          setSelectedClassId('');
          setCandidateClassIds([]);
        },
        onError: (error) => {
          const payload = (error as Error & { payload?: ReviewErrorPayload })
            .payload;
          const ids = payload?.candidateClassIds ?? [];
          if (
            ids.length > 0 ||
            (payload?.message &&
              payload.message.toLowerCase().includes('class'))
          ) {
            setCandidateClassIds(ids);
            setClassPickerMessage(
              payload?.message ??
                'Select a class to complete approval.',
            );
            setClassPickerOpen(true);
          }
        },
      },
    );
  };

  const handleApprove = () => {
    submitApprove();
  };

  const handleReject = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      return;
    }
    reviewApplication.mutate(
      {
        id: applicationId,
        input: { decision: 'reject', rejectionReason: trimmed },
      },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setReason('');
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={reviewApplication.isPending}
          onClick={handleApprove}
        >
          <Check className="size-4" />
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={reviewApplication.isPending}
          onClick={() => setRejectOpen(true)}
        >
          <X className="size-4" />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="rejection-reason">Reason</Label>
            <Textarea
              id="rejection-reason"
              className="mt-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this application was rejected."
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={reviewApplication.isPending || !reason.trim()}
              onClick={handleReject}
            >
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={classPickerOpen} onOpenChange={setClassPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select class</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">{classPickerMessage}</p>
            <Label htmlFor="approve-class">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger id="approve-class">
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classChoices.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              disabled={reviewApplication.isPending || !selectedClassId}
              onClick={() => submitApprove(selectedClassId)}
            >
              Approve with class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
