'use client';

import { useState } from 'react';
import { Check } from '@/lib/icons';
import { getInitials } from '@/lib/helpers';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import {
  getDummyStudentFullName,
  type DummyStudent,
} from '@/lib/acadia/dummy-students';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StudentHero({
  student,
  isLoading,
}: {
  student: DummyStudent | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !student) {
    return (
      <div className="mb-5 flex items-center gap-5">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>
    );
  }

  const fullName = getDummyStudentFullName(student);
  const initials = getInitials(fullName || student.email);

  return <StudentHeroContent student={student} fullName={fullName} initials={initials} />;
}

function StudentHeroContent({
  student,
  fullName,
  initials,
}: {
  student: DummyStudent;
  fullName: string;
  initials: string;
}) {
  const { copyToClipboard } = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);

  const handleStudentIdCopy = () => {
    copyToClipboard(student.student_id);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  return (
    <div className="mb-5 flex items-center gap-5">
      <Avatar className="h-14 w-14">
        {student.avatar ? (
          <AvatarImage src={student.avatar} alt={fullName} />
        ) : null}
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>
      <div className="space-y-px">
        <div className="text-base font-medium">{fullName}</div>
        <div className="text-sm text-muted-foreground">{student.email}</div>
        <div>
          <TooltipProvider>
            <Tooltip delayDuration={50}>
              <TooltipTrigger className="cursor-pointer">
                <Badge
                  variant="secondary"
                  className="gap-1.5 px-2 py-0.5"
                  onClick={handleStudentIdCopy}
                >
                  <span>Student ID: {student.student_id}</span>
                  {showCopied ? <Check className="size-3 text-success" /> : null}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Click to copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
