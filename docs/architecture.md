# Implementation notes

- `src/App.tsx`: responsive application shell and feature pages.
- `src/useRoutine.ts`: session lifecycle, per-user loading, guest storage, serialized mutations.
- `src/data.ts`: exact schedule, starting habits, WITA date arithmetic, statistics, conflict logic.
- `src/components/Forms.tsx`: validated routines, classes, targets, and Supabase authentication.
- `src/components/Visuals.tsx`: original SVG progress ring, flame, landscape, badge components and Lucide SVG mapping.
- `public/sw.js`: same-origin app-shell/assets cache only. Auth and database responses never enter Cache Storage.
- `supabase/migrations`: database schema, owner policies, initialization, internal function privilege hardening.

Guest and account state have separate lifecycles. An authenticated user's failed data load is reported, never silently replaced with guest records. Logout restores the existing device workspace. Network failures do not falsely mark a cloud write successful.
