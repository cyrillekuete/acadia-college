'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function StudentActivityLogsPage() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        No activity recorded for this student yet.
      </CardContent>
    </Card>
  );
}
