const DEFAULT_STAFF_EMAIL_DOMAIN = 'acadia-college.edu';

/** Slug for system login email local part: "Jean-Pierre" → "jean.pierre" */
export function slugifyStaffNamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
}

export function buildStaffEmailLocalPart(firstName: string, lastName: string): string {
  const first = slugifyStaffNamePart(firstName);
  const last = slugifyStaffNamePart(lastName);
  if (!first && !last) {
    return 'teacher';
  }
  if (!first) {
    return last;
  }
  if (!last) {
    return first;
  }
  return `${first}.${last}`;
}

export function staffSystemEmailCandidates(
  firstName: string,
  lastName: string,
  domain: string = DEFAULT_STAFF_EMAIL_DOMAIN,
): string[] {
  const base = buildStaffEmailLocalPart(firstName, lastName);
  const candidates = [`${base}@${domain}`];
  for (let i = 2; i <= 50; i += 1) {
    candidates.push(`${base}.${i}@${domain}`);
  }
  return candidates;
}

export type ResolveStaffSystemEmailInput = {
  firstName: string;
  lastName: string;
  domain?: string;
  isEmailTaken: (email: string) => Promise<boolean>;
};

/** Pick first available firstname.lastname@domain (with numeric suffix if needed). */
export async function resolveStaffSystemEmail(
  input: ResolveStaffSystemEmailInput,
): Promise<string> {
  const domain = input.domain ?? DEFAULT_STAFF_EMAIL_DOMAIN;
  const candidates = staffSystemEmailCandidates(
    input.firstName,
    input.lastName,
    domain,
  );

  for (const email of candidates) {
    const taken = await input.isEmailTaken(email);
    if (!taken) {
      return email;
    }
  }

  throw new Error('Unable to generate a unique system email for this teacher.');
}

export function formatStaffDisplayName(
  title: string | undefined,
  firstName: string,
  lastName: string,
): string {
  const parts = [title?.trim(), firstName.trim(), lastName.trim()].filter(Boolean);
  return parts.join(' ').trim() || firstName.trim() || lastName.trim() || 'Staff member';
}
