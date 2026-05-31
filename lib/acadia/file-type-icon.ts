const EXTENSION_ICON_MAP: Record<string, string> = {
  pdf: 'pdf.svg',
  doc: 'doc.svg',
  docx: 'doc.svg',
  word: 'word.svg',
  xls: 'xls.svg',
  xlsx: 'excel.svg',
  csv: 'excel.svg',
  ppt: 'ppt.svg',
  pptx: 'powerpoint.svg',
  txt: 'txt.svg',
  md: 'text.svg',
  js: 'js.svg',
  mjs: 'js.svg',
  ts: 'javascript.svg',
  tsx: 'javascript.svg',
  jsx: 'javascript.svg',
  css: 'css.svg',
  svg: 'svg.svg',
  png: 'image.svg',
  jpg: 'image.svg',
  jpeg: 'image.svg',
  webp: 'image.svg',
  gif: 'image.svg',
  mp4: 'video.svg',
  mov: 'video.svg',
  webm: 'video-1.svg',
  mp3: 'mp3.svg',
  wav: 'music.svg',
  zip: 'zip.svg',
  ai: 'ai.svg',
  psd: 'psd.svg',
  fig: 'figma.svg',
  sql: 'sql.svg',
};

const MIME_ICON_MAP: Record<string, string> = {
  'application/pdf': 'pdf.svg',
  'application/msword': 'doc.svg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'doc.svg',
  'application/vnd.ms-excel': 'xls.svg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'excel.svg',
  'application/vnd.ms-powerpoint': 'ppt.svg',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'powerpoint.svg',
  'text/plain': 'txt.svg',
  'text/markdown': 'text.svg',
  'application/javascript': 'js.svg',
  'text/javascript': 'js.svg',
  'text/css': 'css.svg',
  'image/svg+xml': 'svg.svg',
  'image/png': 'image.svg',
  'image/jpeg': 'image.svg',
  'image/webp': 'image.svg',
  'image/gif': 'image.svg',
  'video/mp4': 'video.svg',
  'video/webm': 'video-1.svg',
  'audio/mpeg': 'mp3.svg',
  'audio/wav': 'music.svg',
  'application/zip': 'zip.svg',
};

function extensionFromName(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) {
    return null;
  }
  return name.slice(dot + 1).toLowerCase();
}

/** Maps a file name or MIME type to a Metronic file-type icon under `/media/file-types/`. */
export function resolveFileTypeIcon(
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): string {
  const ext = extensionFromName(fileName);
  if (ext && EXTENSION_ICON_MAP[ext]) {
    return EXTENSION_ICON_MAP[ext];
  }

  const normalizedMime = mimeType?.trim().toLowerCase();
  if (normalizedMime && MIME_ICON_MAP[normalizedMime]) {
    return MIME_ICON_MAP[normalizedMime];
  }

  return 'text.svg';
}
