import { describe, expect, it } from 'vitest';
import {
  enrollmentApplicationsHref,
  parseEnrollmentApplicationView,
} from '@/lib/acadia/enrollment';

describe('enrollmentApplicationsHref', () => {
  it('returns the list path without an id', () => {
    expect(enrollmentApplicationsHref()).toBe('/enrollment/applications');
    expect(enrollmentApplicationsHref('  ')).toBe('/enrollment/applications');
  });

  it('opens review by default and adds view for edit or confirmation', () => {
    expect(enrollmentApplicationsHref('app-1')).toBe(
      '/enrollment/applications?applicationId=app-1',
    );
    expect(enrollmentApplicationsHref('app-1', 'review')).toBe(
      '/enrollment/applications?applicationId=app-1',
    );
    expect(enrollmentApplicationsHref('app-1', 'edit')).toBe(
      '/enrollment/applications?applicationId=app-1&view=edit',
    );
    expect(enrollmentApplicationsHref('app-1', 'confirmation')).toBe(
      '/enrollment/applications?applicationId=app-1&view=confirmation',
    );
  });
});

describe('parseEnrollmentApplicationView', () => {
  it('accepts edit and confirmation and defaults to review', () => {
    expect(parseEnrollmentApplicationView('edit')).toBe('edit');
    expect(parseEnrollmentApplicationView('confirmation')).toBe('confirmation');
    expect(parseEnrollmentApplicationView('review')).toBe('review');
    expect(parseEnrollmentApplicationView('other')).toBe('review');
    expect(parseEnrollmentApplicationView(null)).toBe('review');
  });
});
