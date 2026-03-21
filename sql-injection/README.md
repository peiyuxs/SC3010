# SQL Injection Demo (Intentionally Vulnerable)

This project is a local-only training demo that intentionally contains insecure authentication logic so you can observe a SQL injection attack end-to-end.

## What this project contains

- A Next.js app with:
  - Login page at `/`
  - Protected user page at `/user`
  - Protected admin page at `/admin`
- A local PostgreSQL database in Docker (host port `5433`)
- Seeded demo users (one `user`, one `admin`) with plain-text passwords
- An intentionally vulnerable login API that interpolates raw input directly into SQL

## Security warning

This code is intentionally insecure and should never be used in production.

- It stores passwords in plain text.
- It builds SQL with raw string interpolation.
- It is designed only for learning in an isolated environment.

## Project structure (important files)

- Database container config: [docker-compose.yml](docker-compose.yml)
- Initial SQL schema + seed data: [db/seed.sql](db/seed.sql)
- Manual reseed script: [scripts/seed.mjs](scripts/seed.mjs)
- DB connection helper: [lib/db.ts](lib/db.ts)
- Vulnerable login API: [app/api/login/route.ts](app/api/login/route.ts)
- Logout API: [app/api/logout/route.ts](app/api/logout/route.ts)
- Login UI: [app/page.tsx](app/page.tsx)
- User page: [app/user/page.tsx](app/user/page.tsx)
- Admin page: [app/admin/page.tsx](app/admin/page.tsx)
- Route protection middleware: [middleware.ts](middleware.ts)
- Environment template: [.env.example](.env.example)

## How authentication works (and why this is vulnerable)

The login endpoint at [app/api/login/route.ts](app/api/login/route.ts) reads `email` and `password` from request input and builds SQL like this:

`WHERE email = '${email}' AND password = '${password}'`

Because user input is inserted directly into the SQL string, an attacker can change query logic via crafted input (SQL injection).

On success, the app sets two cookies:

- `session_email`
- `session_role`

Access control checks:

- `/user` requires a session email
- `/admin` requires session email + `session_role=admin`

Those checks exist in [middleware.ts](middleware.ts), and pages also guard access server-side.

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop (or Docker Engine + Compose)

## Setup and run

From this folder (`sql-injection`):

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env.local
```

3. Start PostgreSQL container

```bash
docker compose up -d
```

4. Seed database (safe to run repeatedly)

```bash
npm run db:seed
```

5. Start app

```bash
npm run dev
```

6. Open app

`http://localhost:3000`

## Demo credentials

- User: `user@demo.local` / `user123`
- Admin: `admin@demo.local` / `admin123`

## Demonstration walkthrough

### 1) Normal login

1. Log in with `user@demo.local` and `user123`
2. You should be redirected to `/user`
3. Trying to open `/admin` should redirect back to `/`

### 2) SQL injection login bypass

1. On the login form, enter:
   - Email: `admin@demo.local`
   - Password: `' OR '1'='1' --`
2. Submit
3. The vulnerable SQL can evaluate truthfully and return a row with admin role
4. You can end up authenticated as admin and access `/admin`

## Resetting the demo state

If you want a clean state:

```bash
npm run db:seed
```

If you want to fully recreate DB volume and run init SQL again:

```bash
docker compose down -v
docker compose up -d
npm run db:seed
```

## Notes for developers

- `docker-compose.yml` maps host `5433 -> container 5432` to avoid conflict with an existing local Postgres on `5432`.
- The `db:seed` script uses `.env.local` and repopulates `users` deterministically.
- This repository intentionally demonstrates bad practices to teach secure coding.
