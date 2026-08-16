'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export type RecordDetailField = {
  label: string;
  value: ReactNode;
};

export function RecordDetailCard({
  title,
  fields,
}: {
  title: string;
  fields: RecordDetailField[];
}) {
  return (
    <Card className="min-w-full h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-3">
        <Table className="align-middle text-sm">
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.label}>
                <TableCell className="min-w-36 py-2.5 font-normal text-secondary-foreground">
                  {field.label}
                </TableCell>
                <TableCell className="py-2.5 font-normal text-foreground">
                  {field.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
