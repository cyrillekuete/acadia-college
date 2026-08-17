import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveReportCardLogoStorageKey,
  resolveReportCardLogoUrl,
  TENANT_ASSETS_BUCKET,
} from '@/lib/supabase/storage';

describe('resolveReportCardLogoStorageKey', () => {
  it('prefers the dedicated report-card logo', () => {
    expect(
      resolveReportCardLogoStorageKey({
        reportCardLogoStorageKey: 'tenant-1/report-card-logo.png',
        logoStorageKey: 'tenant-1/logo.svg',
      }),
    ).toBe('tenant-1/report-card-logo.png');
  });

  it('falls back to the institution logo', () => {
    expect(
      resolveReportCardLogoStorageKey({
        reportCardLogoStorageKey: null,
        logoStorageKey: 'tenant-1/logo.svg',
      }),
    ).toBe('tenant-1/logo.svg');
    expect(
      resolveReportCardLogoStorageKey({
        reportCardLogoStorageKey: '  ',
        logoStorageKey: 'tenant-1/logo.svg',
      }),
    ).toBe('tenant-1/logo.svg');
  });

  it('returns null when neither logo is set', () => {
    expect(resolveReportCardLogoStorageKey(null)).toBeNull();
    expect(
      resolveReportCardLogoStorageKey({
        reportCardLogoStorageKey: '  ',
        logoStorageKey: '',
      }),
    ).toBeNull();
  });
});

describe('resolveReportCardLogoUrl', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
    if (previousKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
    }
  });

  it('builds a public URL from the winning storage key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefgh.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

    expect(
      resolveReportCardLogoUrl({
        reportCardLogoStorageKey: 'tenant-1/report-card-logo.png',
        logoStorageKey: 'tenant-1/logo.svg',
      }),
    ).toBe(
      `https://abcdefgh.supabase.co/storage/v1/object/public/${TENANT_ASSETS_BUCKET}/tenant-1/report-card-logo.png`,
    );
  });
});
