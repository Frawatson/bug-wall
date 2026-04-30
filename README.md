# Bug Wall

A leaderboard of the worst, weirdest, and most embarrassing bugs ever shipped. Post a bug, upvote/downvote, filter by category. Built as a deployment target for **grapple-pr.com** — the app is intentionally simple but has enough surface area (forms, validation, sorting, mutations, DB queries) to be broken and fixed by AI-reviewed PRs.

---

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Drizzle ORM** + **PostgreSQL** (self-hosted via Docker)
- **Server Actions** for create / vote / delete
- **Zod** for input validation

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker compose up -d
```

This brings up Postgres 16 on `localhost:5432` with credentials `bugwall:bugwall` and a persistent volume in `./postgres-data`.

### 3. Configure env

```bash
cp .env.example .env
```

The default `.env` already points at the local Docker Postgres.

### 4. Run migrations and (optionally) seed data

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

Health check: http://localhost:3000/api/health

---

## Deployment

### App → Vercel

1. Push this repo to GitHub.
2. On Vercel: **New Project → import the repo**. Framework auto-detects as Next.js.
3. Add the environment variable **`DATABASE_URL`** pointing at your Postgres (see below).
4. Deploy.
5. Add the custom domain `grapple-pr.com` under **Project → Settings → Domains**.

### Database options

Pick one — **the app only needs a `DATABASE_URL`**.

#### Option A: Self-hosted Postgres in a container (recommended for the grapple-pr workflow)

Spin up the same Docker Compose on any VPS / Railway / Fly.io / Render:

- **Railway**: New Project → Deploy Postgres. Copy the `DATABASE_URL` from the Postgres service into Vercel.
- **Fly.io**: `fly postgres create` → copy connection string.
- **VPS**: `git pull && docker compose up -d`. Open port 5432 (or proxy through Caddy/Tailscale). Use `DATABASE_URL=postgresql://bugwall:bugwall@your-host:5432/bugwall`.

After the DB is reachable, run migrations once from your laptop pointed at the prod URL:

```bash
DATABASE_URL=postgresql://... npm run db:migrate
DATABASE_URL=postgresql://... npm run db:seed   # optional
```

#### Option B: Managed (zero-ops) Postgres

- **Vercel Postgres** (Storage tab in Vercel dashboard) — auto-injects `DATABASE_URL`.
- **Neon** — free tier, paste the pooled connection string into Vercel.

Then run migrations from your laptop the same way.

---

## How this app gets used with grapple-pr

1. **Deploy main** to Vercel and point `grapple-pr.com` at it. Confirm the site is live and seeded.
2. **Open PR #1 — "Add features" with intentional bugs.** Examples of bugs you can introduce on a branch:
   - Swap `bugs.upvotes` and `bugs.downvotes` in the score expression so "top" sort is inverted.
   - Remove the `revalidatePath('/')` calls from server actions so the UI never updates after a vote.
   - Drop the `eq(bugs.category, category)` filter so category chips do nothing.
   - Off-by-one in `parseSort` (return `'top'` instead of `'new'`).
   - Hardcode `direction === 'up'` in `voteBug` so downvotes also increment upvotes.
   - Remove the Zod `.min(3)` from `createBugSchema` so empty titles are allowed.
   - Forget `await` on `db.insert` so submissions silently no-op.
   - Mutate state without bumping React state in `BugCard` so the score never re-renders.
3. **Let grapple-pr review the PR.** It should flag the regressions and, if configured, propose a patch.
4. **Deploy the grapple-suggested patch** as a Vercel preview. Walk through the UI to confirm fixes.
5. **Merge** when green.

A clean `main` branch is kept as the baseline so each round of testing starts from a known-working state.

---

## Project layout

```
src/
  app/
    layout.tsx            # root layout, dark theme
    page.tsx              # home: form + list + filters
    actions.ts            # server actions (createBug, voteBug, deleteBug)
    globals.css           # tailwind + global styles
    api/health/route.ts   # /api/health endpoint
  components/
    BugForm.tsx           # create bug form (client)
    BugList.tsx           # server: maps rows to cards
    BugCard.tsx           # client: optimistic vote, delete
    CategoryFilter.tsx    # category chips (server)
    SortToggle.tsx        # top/new toggle (server)
  db/
    schema.ts             # drizzle schema (bugs table, category enum)
    index.ts              # drizzle client
    migrate.ts            # migration runner (npm run db:migrate)
    seed.ts               # seed runner (npm run db:seed)
drizzle/
  0000_init.sql           # initial migration
  meta/                   # drizzle-kit metadata
docker-compose.yml         # self-hosted Postgres
drizzle.config.ts          # drizzle-kit config
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run db:migrate` | Apply SQL migrations from `./drizzle` |
| `npm run db:seed` | Insert sample bugs |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
