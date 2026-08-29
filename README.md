# Yutori Method™ Executive Leverage Blueprint

Milestone 1: Foundation + Configurable Activity Engine.

This README covers what's implemented, how to run it, and what's explicitly
deferred to later milestones. See also:

- [`docs/CLIENT_QUESTIONS.md`](docs/CLIENT_QUESTIONS.md) — open questions for
  Yutori Method, consolidated for the shared Google Doc.
- [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) — choices
  made where the brief left room for engineering judgment, and why.
- [`docs/TESTING.md`](docs/TESTING.md) — the Milestone 1 acceptance gate and
  what has/hasn't been run against a live environment yet.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** — Postgres, Auth (passwordless magic link), Row Level Security
- Deploys to Vercel; no separate servers, queues, or Redis

## What's built (Milestone 1)

- Database foundation: `participants`, `sessions`, `participant_sessions`,
  `modules`, `participant_module_progress`, plus the configurable activity
  engine tables (`assessments`, `questions`, `answer_options`, `responses`)
- Passwordless (magic-link) auth for participants, separately for admins
- Participant registration via a per-session join link, with duplicate
  registration prevented at the database level
- Participant dashboard showing the 7-module journey with
  LOCKED / OPEN / IN PROGRESS / COMPLETE state (Character stays locked until
  the live workshop, per the brief)
- One module (Operating Altitude) wired to the configurable activity engine
  with a placeholder assessment, demonstrating autosave end to end
- Admin: magic-link sign-in gated by an allowlist, session create/edit,
  cohort-wide "unlock next module" with confirmation, participant roster
  with progress
- Row Level Security on every table; no service-role key in client code
- Dev-only seed data, clearly labeled and excluded from production by design

## What's deliberately not built yet

Per the brief's Content Dependency Register and the Milestone 2-4 split:
final assessment content and scoring, Zone of Investment logic, Delegation
Beliefs scoring, Executive Support Audit, the recommendation engine,
architecture reveal, Blueprint PDF, aggregate analytics, CSV export,
Presentation Mode. The schema and module-state model are built so these can
be added without restructuring what's here — see
`docs/ARCHITECTURE_DECISIONS.md`.

## Local setup

1. **Install dependencies**

   ```
   npm install
   ```

2. **Create a Supabase project** (free tier is fine for development) at
   [supabase.com](https://supabase.com).

3. **Apply the database schema.** Either:

   - Link the CLI to your project and push migrations:
     ```
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
   - Or run each file in `supabase/migrations/` in order through the
     Supabase SQL editor.

   Do **not** run `supabase/seed.sql` against a production project — it
   inserts a demo session and a placeholder assessment for local development
   only.

4. **Configure environment variables.** Copy `.env.local.example` to
   `.env.local` and fill in your project's URL, anon key, and (for the admin
   seed script only) service role key — all from Project Settings → API.

5. **Create your first admin account**

   ```
   npm run seed:admin -- you@example.com "Your Name"
   ```

   Sign in at `/admin/login`.

6. **Create a session** from `/admin`, then use the join link it generates
   (`/join/<code>`) to register as a participant in another browser/session.

7. **Run the app**

   ```
   npm run dev
   ```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run seed:admin -- <email> "<name>"` — provision a facilitator account

## Database types

`src/types/database.ts` is hand-written to mirror the migrations, since no
live Supabase project was available to generate types against during this
milestone. Once a project is linked, regenerate it and remove the note at
the top of that file:

```
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## A note on testing this milestone

Docker was not available in the environment this was built in, so the
Supabase local dev stack (`supabase start`) could not be run, and the
acceptance gate below could not be clicked through end-to-end here.
Everything has been verified with `tsc --noEmit`, ESLint, and a production
build — those confirm the code compiles and is internally consistent, not
that every flow behaves correctly against a real database. Please run
through `docs/TESTING.md` against a real Supabase project before treating
Milestone 1 as accepted.
