import { describe, expect, it } from 'vitest';
import { resolveFileTypeIcon } from '@/lib/acadia/file-type-icon';
import {
  mapUserRecentUploadRow,
  type UserRecentUploadRow,
} from '@/lib/supabase/queries/user-uploads';

describe('resolveFileTypeIcon', () => {
  it('maps common extensions', () => {
    expect(resolveFileTypeIcon('notes.pdf', null)).toBe('pdf.svg');
    expect(resolveFileTypeIcon('report.docx', null)).toBe('doc.svg');
    expect(resolveFileTypeIcon('bundle.zip', null)).toBe('zip.svg');
  });

  it('falls back to mime type then default icon', () => {
    expect(resolveFileTypeIcon(null, 'application/pdf')).toBe('pdf.svg');
    expect(resolveFileTypeIcon('unknown-file', 'application/octet-stream')).toBe(
      'text.svg',
    );
  });
});

describe('mapUserRecentUploadRow', () => {
  it('builds display fields from storage key and resolver', () => {
    const row: UserRecentUploadRow = {
      id: 'lm-1',
      titleEn: 'Term notes',
      titleFr: null,
      storageKey: 'tenant-1/materials/lm-1/notes.pdf',
      externalUrl: null,
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      createdAt: '2026-05-23T12:00:00.000Z',
    };

    const item = mapUserRecentUploadRow(row, (key) =>
      key === row.storageKey ? 'https://cdn.test/notes.pdf' : null,
    );

    expect(item).toEqual({
      id: 'lm-1',
      title: 'Term notes',
      fileName: 'notes.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      createdAt: '2026-05-23T12:00:00.000Z',
      href: 'https://cdn.test/notes.pdf',
    });
  });

  it('uses external URL when no storage key exists', () => {
    const row: UserRecentUploadRow = {
      id: 'lm-2',
      titleEn: 'Video link',
      titleFr: null,
      storageKey: null,
      externalUrl: 'https://example.com/video',
      fileSizeBytes: null,
      mimeType: null,
      createdAt: '2026-05-23T12:00:00.000Z',
    };

    const item = mapUserRecentUploadRow(row, () => null);
    expect(item.href).toBe('https://example.com/video');
    expect(item.fileName).toBeNull();
  });
});
