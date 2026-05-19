'use client';

import Link from 'next/link';
import { BarChart3, BookOpen, Plus, UserPlus } from '@/lib/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ACTIONS = [
  {
    label: 'Enrol New Student',
    href: '/students/new',
    icon: Plus,
  },
  {
    label: 'Add New Teacher',
    href: '/staff',
    icon: UserPlus,
  },
  {
    label: 'Create New Class',
    href: '/classes',
    icon: BookOpen,
  },
  {
    label: 'Generate Reports',
    href: '/finance/reports',
    icon: BarChart3,
  },
] as const;

export function AdminQuickActions() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {ACTIONS.map(({ label, href, icon: Icon }) => (
          <Button
            key={href}
            variant="outline"
            className="h-11 w-full justify-start gap-2.5 font-normal"
            asChild
          >
            <Link href={href}>
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
