# Acadia College — Supabase layer

Acadia College uses **Supabase Auth** and **Postgres** (`database.sql` schema) for school data.

- Browser client: `lib/supabase/client.ts`
- Server client: `lib/supabase/server.ts`
- Session refresh: `proxy.ts` + `lib/supabase/proxy.ts`
- Tenant logos: `lib/supabase/storage.ts` → public `tenant-assets` bucket
- RLS helpers: migration `20260516130000_acadia_tenant_rls_and_storage.sql`

## Data source boundaries

| Area | Source |
|------|--------|
| Protected app routes (`app/(protected)/**` except legacy redirects) | **Supabase** via `useAcadiaCollegeSession`, `useSupabaseTableList`, `useSupabaseRecord` |
| `/admin/users`, `/admin/roles` | **Supabase** `User` / `UserRole` tables |
| `/user-management/**` APIs + UI | **Prisma** (template legacy) |
| NextAuth (`app/api/auth/**`) | **Prisma** |

Do not add new school-domain features on Prisma. Use Supabase queries and apply migrations under `supabase/migrations/`.

## Environment alignment (fixes “Failed to fetch” on sign-in)

`NEXT_PUBLIC_SUPABASE_URL` must be `https://<project-ref>.supabase.co` for the **same** project as `DATABASE_URL` (`postgres.<project-ref>` in the host). Acadia College uses project ref **`mjjulujygiibfndtapud`** (Supabase project name: `acadia-college`, region `ca-central-1`).

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **API**.
2. Set `NEXT_PUBLIC_SUPABASE_URL` to **Project URL**.
3. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the **publishable** key from that page (not a key from another project).
4. Restart `npm run dev` after changing `.env.local`.
5. Under **Authentication** → **URL Configuration**, add redirect URL `http://localhost:3000/auth/callback` (and your production URL).

## Tenant logo upload

1. Create bucket `tenant-assets` (included in migration above).
2. Upload e.g. `{tenantId}/logo.png` via Supabase Storage dashboard or API.
3. Set `Tenant.logoStorageKey` to that path (e.g. `117b136b-.../logo.png`).
4. Sidebar and institution profile will show the public storage URL.
