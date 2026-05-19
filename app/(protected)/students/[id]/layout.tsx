'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, MoveLeft, UserPen } from '@/lib/icons';
import { getDummyStudentById } from '@/lib/acadia/dummy-students';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';
import { StudentProvider } from '@/components/acadia/student/student-context';
import { StudentHero } from '@/components/acadia/student/student-hero';

type NavRoutes = Record<
  string,
  {
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    path: string;
  }
>;

export default function StudentDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  const { data: student, isLoading, isFetched } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => getDummyStudentById(id) ?? null,
    enabled: !!id,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isFetched && !student) {
      router.replace('/students');
    }
  }, [isFetched, student, router]);

  const navRoutes = useMemo<NavRoutes>(
    () => ({
      profile: {
        title: 'Profile',
        icon: UserPen,
        path: `/students/${id}`,
      },
      logs: {
        title: 'Activity Logs',
        icon: Activity,
        path: `/students/${id}/logs`,
      },
    }),
    [id],
  );

  useEffect(() => {
    const found = Object.keys(navRoutes).find(
      (key) => pathname === navRoutes[key].path,
    );
    setActiveTab(found ?? 'profile');
  }, [navRoutes, pathname]);

  const handleTabChange = (key: string) => {
    const route = navRoutes[key];
    if (!route) {
      return;
    }
    setActiveTab(key);
    router.push(route.path);
  };

  if (isFetched && !student) {
    return null;
  }

  return (
    <StudentProvider student={student ?? undefined} isLoading={isLoading}>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Student</ToolbarTitle>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/students">Students</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>
          <ToolbarActions>
            <Button asChild variant="outline">
              <Link href="/students">
                <MoveLeft /> Back to students
              </Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
        <StudentHero student={student ?? undefined} isLoading={isLoading} />
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList variant="line" className="mb-5">
            {Object.entries(navRoutes).map(([key, { title, icon: Icon }]) => (
              <TabsTrigger key={key} value={key}>
                <Icon />
                <span>{title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {children}
      </Container>
    </StudentProvider>
  );
}
