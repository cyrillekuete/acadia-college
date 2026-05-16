/** Extract Supabase project ref from `https://<ref>.supabase.co`. */
export function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Extract project ref from Postgres host `postgres.<ref>` in DATABASE_URL. */
export function projectRefFromDatabaseUrl(databaseUrl: string): string | null {
  try {
    const host = new URL(databaseUrl).hostname;
    const match = host.match(/^postgres\.([a-z0-9]+)$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseProjectRefMismatchMessage(
  supabaseUrl: string,
  databaseUrl?: string,
): string | null {
  if (!databaseUrl) {
    return null;
  }

  const apiRef = projectRefFromSupabaseUrl(supabaseUrl);
  const dbRef = projectRefFromDatabaseUrl(databaseUrl);

  if (!apiRef || !dbRef || apiRef === dbRef) {
    return null;
  }

  return (
    `Supabase project mismatch: NEXT_PUBLIC_SUPABASE_URL uses "${apiRef}" but ` +
    `DATABASE_URL uses "${dbRef}". Use the API URL and keys from the same project ` +
    `(Dashboard → Project Settings → API).`
  );
}
