'use client';

import {
  Book,
  CalendarCheck,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import { Options, IOptionsItems } from './components';

export function AccountGetStartedContent() {
  const items: IOptionsItems = [
    {
      icon: Users,
      title: 'Students',
      desc: 'Manage student profiles and matricules.',
      path: '/students',
    },
    {
      icon: Users,
      title: 'Staff',
      desc: 'Manage staff profiles and departments.',
      path: '/staff',
    },
    {
      icon: Book,
      title: 'Subjects',
      desc: 'Subject catalog and assignments.',
      path: '/subjects',
    },
    {
      icon: CalendarCheck,
      title: 'Attendance',
      desc: 'Sessions and attendance records.',
      path: '/attendance',
    },
    {
      icon: Wallet,
      title: 'Student fees',
      desc: 'Fee accounts and installments.',
      path: '/finance/fees',
    },
    {
      icon: Settings,
      title: 'Institution settings',
      desc: 'Acadia College tenant and system preferences.',
      path: '/account/home/company-profile',
    },
  ];

  return <Options items={items} dropdown={false} />;
}
