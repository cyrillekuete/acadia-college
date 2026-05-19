'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, FileText, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useEnrollmentMutations } from '@/hooks/use-enrollment-mutations';

export function ApplicationReviewActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: string;
}) {
  const { reviewApplication } = useEnrollmentMutations();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

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

  const handleApprove = () => {
    reviewApplication.mutate({
      id: applicationId,
      input: { decision: 'approve' },
    });
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
    </>
  );
}
