import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'a',
];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function isEmptyRichText(html: string | null | undefined): boolean {
  if (!html) {
    return true;
  }
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
  return text.length === 0;
}

export function normalizeRichText(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  const sanitized = sanitizeHtml(html);
  return isEmptyRichText(sanitized) ? '' : sanitized;
}
