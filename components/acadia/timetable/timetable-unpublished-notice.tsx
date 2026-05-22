'use client';

import { Card, CardContent } from '@/components/ui/card';

export function TimetableUnpublishedNotice({
  message = 'The timetable for this academic year has not been published yet. Check back once your school publishes it.',
}: {
  message?: string;
}) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
