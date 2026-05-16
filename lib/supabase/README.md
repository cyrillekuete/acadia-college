# Acadia College — Supabase layer

Acadia College uses **Supabase Auth** and **Postgres** (`database.sql` schema) for school data.

- Browser client: `lib/supabase/client.ts`
- Server client: `lib/supabase/server.ts`
- Session refresh: `middleware.ts` + `lib/supabase/middleware.ts`

Template **NextAuth** + **Prisma** remain for legacy `user-management` API routes only; protected app routes use Supabase session via `useAcadiaCollegeSession`.
