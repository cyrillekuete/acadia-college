'use client';

import Link from 'next/link';
import { BarChart3, BookOpen, CalendarCheck, LayoutGrid, Plus, UserPlus } from '@/lib/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

const ACTIONS = [
  {
    labelKey: 'admin.configureAcademicYear',
    href: '/academics/years',
    icon: CalendarCheck,
  },
  {
    labelKey: 'admin.enrolNewStudent',
    href: '/students/new',
    icon: Plus,
  },
  {
    labelKey: 'admin.addNewTeacher',
    href: '/staff/new',
    icon: UserPlus,
  },
  {
    labelKey: 'admin.createNewClass',
    href: '/classes',
    icon: BookOpen,
  },
  {
    labelKey: 'admin.manageSubjectCatalog',
    href: '/subjects',
    icon: BookOpen,
  },
  {
    labelKey: 'admin.manageSubjectGroupings',
    href: '/subjects/groupings',
    icon: LayoutGrid,
  },
  {
    labelKey: 'admin.generateReports',
    href: '/finance/reports',
    icon: BarChart3,
  },
] as const;

export function AdminQuickActions() {
  const { t } = useTranslation();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('admin.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {ACTIONS.map(({ labelKey, href, icon: Icon }) => (
          <Button
            key={href}
            variant="outline"
            className="h-11 w-full justify-start gap-2.5 font-normal"
            asChild
          >
            <Link href={href}>
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {t(labelKey)}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
