# Bug-finding memory

Entries are open or rejected PRs only. Merged and otherwise-fixed bugs are removed.

- `hooks/use-subject-mutations.ts` `replaceSubjectSubBranches` deleted and recreated papers with new IDs on every subject save, cascading away `ClassSubjectSubBranch` rows — https://github.com/cyrillekuete/acadia-college/pull/2 — open — 2026-08-15
