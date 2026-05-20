'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Activity, MoveLeft, UserPen } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
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
import UserHero from '@/app/(protected)/user-management/users/[id]/components/user-hero';
import { User, UserStatus } from '@/app/models/user';
import { requireBrowserClient } from '@/lib/supabase/client';
import {
  isAcadiaTenantQueryEnabled,
  useAcadiaCollegeSession,
} from '@/hooks/use-acadia-college-session';
import { unwrapRelation } from '@/lib/acadia/record-display';

const USER_DETAIL_SELECT = `
  id,
  email,
  name,
  status,
  roleId,
  avatar,
  createdAt,
  updatedAt,
  lastSignInAt,
  isProtected,
  isTrashed,
  UserRole:roleId ( id, slug, name, isTrashed, isProtected, isDefault, createdAt )
`;

type NavRoutes = Record<
  string,
  {
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    path: string;
  }
>;

function mapToUserModel(
  row: Record<string, unknown> | null | undefined,
): User | null {
  if (!row) {
    return null;
  }
  const role = unwrapRelation<{
    id: string;
    slug: string;
    name: string;
    isTrashed?: boolean;
    isProtected?: boolean;
    isDefault?: boolean;
    createdAt?: string;
  }>(row.UserRole);

  if (!role) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    name: row.name ? String(row.name) : null,
    roleId: String(row.roleId ?? role.id),
    status: (row.status as UserStatus) ?? UserStatus.ACTIVE,
    createdAt: new Date(String(row.createdAt ?? Date.now())),
    updatedAt: new Date(String(row.updatedAt ?? Date.now())),
    lastSignInAt: row.lastSignInAt
      ? new Date(String(row.lastSignInAt))
      : null,
    isTrashed: Boolean(row.isTrashed),
    isProtected: Boolean(row.isProtected),
    avatar: row.avatar ? String(row.avatar) : null,
    role: {
      id: role.id,
      slug: role.slug,
      name: role.name,
      isTrashed: Boolean(role.isTrashed),
      isProtected: Boolean(role.isProtected),
      isDefault: Boolean(role.isDefault),
      createdAt: new Date(String(role.createdAt ?? Date.now())),
    },
  };
}

export default function AdminUserDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  const { data: session, isLoading: sessionLoading, isError: sessionError } =
    useAcadiaCollegeSession();
  const tenantId = session?.tenantId ?? null;

  const navRoutes = useMemo<NavRoutes>(
    () => ({
      general: {
        title: 'Profile',
        icon: UserPen,
        path: `/admin/users/${id}`,
      },
      logs: {
        title: 'Activity Logs',
        icon: Activity,
        path: `/admin/logs?userEmail=`,
      },
    }),
    [id],
  );

  const { data: userRow, isLoading } = useQuery({
    queryKey: ['acadia-admin-user-layout', id, tenantId],
    queryFn: async () => {
      const supabase = requireBrowserClient();
      const { data, error } = await supabase
        .from('User')
        .select(USER_DETAIL_SELECT)
        .eq('id', id)
        .eq('tenantId', tenantId!)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data as Record<string, unknown> | null;
    },
    enabled:
      Boolean(id) &&
      isAcadiaTenantQueryEnabled(sessionLoading, sessionError, session, tenantId),
  });

  const user = mapToUserModel(userRow);
  const logsPath = user?.email
    ? `/admin/logs?userEmail=${encodeURIComponent(user.email)}`
    : `/admin/logs`;

  useEffect(() => {
    if (pathname === `/admin/users/${id}`) {
      setActiveTab('general');
    }
  }, [pathname, id]);

  const handleTabClick = (key: string, path: string) => {
    setActiveTab(key);
    if (key === 'logs') {
      router.push(logsPath);
      return;
    }
    router.push(path);
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>User</ToolbarTitle>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>User Management</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/users">Users</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>
          <ToolbarActions>
            <Button asChild variant="outline">
              <Link href="/admin/users">
                <MoveLeft /> Back to users
              </Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
        <UserHero
          user={(user ?? { id: '', email: '', roleId: '', status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), isTrashed: false, isProtected: false, role: { id: '', slug: '', name: '', isTrashed: false, isProtected: false, isDefault: false, createdAt: new Date() } }) as User}
          isLoading={isLoading || !user}
        />
        <Tabs value={activeTab}>
          <TabsList variant="line" className="mb-5">
            {Object.entries(navRoutes).map(
              ([key, { title, icon: Icon }]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  disabled={isLoading}
                  onClick={() =>
                    handleTabClick(
                      key,
                      key === 'logs' ? logsPath : navRoutes[key].path,
                    )
                  }
                >
                  <Icon />
                  <span>{title}</span>
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
        {children}
      </Container>
    </>
  );
}
