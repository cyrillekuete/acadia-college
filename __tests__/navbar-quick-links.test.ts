import { describe, expect, it } from 'vitest';
import { getNavbarQuickLinksForRole } from '@/config/menu.acadia';

describe('getNavbarQuickLinksForRole', () => {
  it('returns admin quick links for default roles', () => {
    const links = getNavbarQuickLinksForRole('admin');
    expect(links.map((item) => item.title)).toEqual([
      'Academic structure',
      'Enrollment',
      'Finance',
      'User Management',
    ]);
    expect(links[0]?.children).toHaveLength(7);
  });

  it('returns staff quick links', () => {
    const links = getNavbarQuickLinksForRole('staff');
    expect(links.map((item) => item.title)).toEqual([
      'Students',
      'Attendance',
      'Marks',
      'Exams',
    ]);
  });

  it('returns student quick links with mixed link types', () => {
    const links = getNavbarQuickLinksForRole('student');
    expect(links.map((item) => item.title)).toEqual([
      'Timetable',
      'Marks',
      'Fees',
      'Messages',
    ]);
    expect(links[0]?.path).toBe('/timetable');
    expect(links[3]?.children?.length).toBeGreaterThan(0);
  });
});
