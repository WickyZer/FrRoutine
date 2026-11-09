# FrRoutine

A personal routine and study planner with a warm Sunset Liquid Glass interface. Responsive React + TypeScript + Vite, Supabase Auth/Postgres, and installable PWA metadata.

## Run

Node.js 22.18+ or 24 LTS:

```sh
npm ci
npm run dev
npm test
npm run build
```

## Vercel

Import `WickyZer/FrRoutine`, select the `main` branch, and deploy. The included `vercel.json` specifies Vite and the `dist` output. The client already contains this project's **publishable** URL/key, so no SQL or environment variable setup is needed. Optional environment overrides are documented in `.env.example`. Never use a secret or service-role key in this frontend.

Once a permanent deployment domain exists, configure that exact URL under Supabase **Authentication → URL Configuration** as Site URL and an allowed redirect URL. This is required for confirmation and password recovery emails to return to the live application. Existing Supabase defaults may point to localhost. Do not disable email verification to work around a missing URL. Email delivery follows the project's configured Supabase SMTP limits.

The migrations in `supabase/migrations` have already been applied to the FrRoutine project. They are retained as source history; do not reapply them to the same database. No JasaHUB data was modified.

## Features

- Dashboard, weekly date selection, routine search, category filters.
- Ten suggested daily habits. The personal twelve-class timetable is configured privately in the hosted database and loads on account sign-in; guest mode starts without personal classes. Classes are editable per account.
- Habit create/edit/archive/restore; per-date completion and persisted progress.
- Combined chronological class/routine schedule. Forms reject class conflicts, with a 20-minute preparation buffer between habits and classes.
- Statistics over 7 or 30 days; real completion counts, learning minutes, streaks, and achievements.
- Goals with manually adjustable progress; daily journals and mood tracking.
- 25-minute focus timer, foreground browser reminders, profile editing, JSON export.
- Email/password signup/login, password recovery, persisted sessions, private per-user records.
- Guest mode stores data on the current browser. Guest records are intentionally separate from account data and are not uploaded automatically. Export them before clearing browser storage.
- PWA icons from the supplied brand image, standalone manifest, offline shell caching. The original wordmarks are used for branding and the initial loading screen. Fonts are self-hosted with their OFL licenses.

## Behavior and limits

- WITA (`Asia/Makassar`, UTC+8), matching the supplied Samarinda schedule. Days change at WITA midnight.
- New accounts receive their own clean starter habits on first successful login. This hosted project additionally provisions the private class template; public migration source intentionally omits personal timetable values. Initialization is atomic and idempotent. No fake completed tasks, streaks, chart values, or unlocked badges are seeded.
- Streak increments at 70% completion of a day's scheduled active habits; an unfinished current day does not erase yesterday's streak. Statistics use current active schedules since each habit's creation date; editing/archiving a habit can change historical percentages. Archived records retain completion history.
- Target progress is entered manually and is not inferred from a timer or routine name.
- Account data loads on sign-in and refresh, and writes go directly to Supabase. Refresh another device to fetch its latest state. Offline account edits are blocked; guest changes remain available locally. There is no background sync queue.
- Notification permission is requested only after a user action. Reminders work while this page is open and notifications are allowed. Closed-app push notifications are not implemented. A focus timer ends when its dialog/page closes.
- PWA installation/service workers require HTTPS (or localhost). Installation and email redirect verification must be checked on the final Vercel HTTPS domain. The local HTTP preview cannot validate those browser capabilities.
- JSON export is a backup/download; importing backups is not included.

## Security and validation

All six tables use RLS and owner-scoped SELECT/INSERT/UPDATE/DELETE policies, including `WITH CHECK`. Unauthenticated table access and initialization are denied. The initialization RPC is `SECURITY INVOKER`. A composite ownership foreign key prevents completions from referencing another user's habits. User metadata supplies display names only, never access decisions. No service-role credentials are committed.

Validation performed:

- TypeScript/production build.
- Unit checks for WITA/year boundaries, calendar weeks, schedule buffer conflicts, completion counting, and streak behavior.
- Live database transactional checks for initial data, duplicate initialization, account isolation, ownership reassignment, future completion dates, and foreign habit references. All temporary records rolled back.
- `node scripts/check-api.mjs`: live Auth availability, email signup setting, anonymous REST rejection, and RPC authentication.
- Supabase Security Advisor, dependency audit, desktop/mobile browser interaction and responsive layout checks.

Email inbox confirmation, password recovery delivery, final-domain installation, and multi-device sign-in require final deployment verification.

## Brand and UI

Cream `#F3F4F5`, orange `#FF9408`, burnt orange `#CA3F16`, crimson `#95122C`, dark `#100C08`. CSS glass surfaces use layered translucency, saturation, blur, rim lighting, and soft shadows with a solid fallback. Navigation and illustrations use genuine SVG (Lucide and purpose-built artwork). Supplied raster logos retain their original visual identity.

## Email confirmation troubleshooting

Registration requires one-time email confirmation. A new account without a session now opens an explicit verification step, rather than implying it can log in immediately. An unconfirmed login shows Indonesian instructions and a resend confirmation action. Resends respect a 60-second UI cooldown and report delivery-rate-limit errors. Password reset remains available separately.

Passwords remain managed by Supabase Auth as bcrypt hashes; plaintext passwords are never copied into profiles, user metadata, logs, analytics, or browser storage. Database administrators can inspect confirmation status without reading passwords. Site URL and redirect allowlist must include the production origin `https://frroutine.vercel.app` in the Supabase dashboard. Existing unconfirmed users still need to click their confirmation email; this UI change does not silently verify email ownership.
