# Code Injection Vulnerability Demo (CVE-2026-0488 Style)

This project demonstrates a critical code injection vulnerability similar to CVE-2026-0488 found in SAP CRM/S/4HANA. An authenticated attacker can exploit a flaw in a generic function module execution handler to execute arbitrary code and SQL statements, resulting in full database compromise.

## What this project contains

- A Next.js app with:
  - Login page at `/`
  - Protected user dashboard at `/user` with script editor
  - Protected admin page at `/admin`
- A local PostgreSQL database in Docker (host port `5434`)
- Seeded demo users (one `user`, one `admin`) with plain-text passwords
- An intentionally vulnerable script executor API that uses `eval()` to execute code
- User-supplied code runs with full database access, allowing SQL injection via code injection

## Security warning

This code is intentionally insecure and should never be used in production.

- It stores passwords in plain text.
- It uses `eval()` to execute user-supplied code.
- It allows authenticated users to execute arbitrary SQL and JavaScript.
- It is designed only for learning in an isolated environment.

## Project structure (important files)

- Database container config: [docker-compose.yml](docker-compose.yml)
- Initial SQL schema + seed data: [db/seed.sql](db/seed.sql)
- Manual reseed script: [scripts/seed.mjs](scripts/seed.mjs)
- DB connection helper: [lib/db.ts](lib/db.ts)
- Login API (parameterized query): [app/api/login/route.ts](app/api/login/route.ts)
- Logout API: [app/api/logout/route.ts](app/api/logout/route.ts)
- **Vulnerable script executor API**: [app/api/execute-script/route.ts](app/api/execute-script/route.ts)
- Login UI: [app/page.tsx](app/page.tsx)
- User dashboard with script editor: [app/user/page.tsx](app/user/page.tsx)
- Admin page: [app/admin/page.tsx](app/admin/page.tsx)
- Route protection middleware: [middleware.ts](middleware.ts)
- Environment template: [.env.example](.env.example)

## Vulnerability: Code Injection via Script Executor (CVE-2026-0488 Style)

After authentication, users land on `/user` with a **Script Editor** form. The backend has a **generic function module executor** at `/api/execute-script` that uses `eval()` to execute user-supplied JavaScript code.

### The flaw

```typescript
// VULNERABLE: eval() executes arbitrary user code
const result = eval(userSuppliedCode);
```

An authenticated attacker can:

1. Write JavaScript code in the script editor
2. Access the `getPool()` function to execute arbitrary SQL
3. Dump user data, modify records, or escalate privileges

### Example attack payload

In the script editor, enter:

```javascript
const { getPool } = await import("@/lib/db");
const pool = getPool();
const res = await pool.query("SELECT * FROM users");
JSON.stringify(res.rows);
```

This executes arbitrary SQL and returns all user records to the attacker.

### Authentication & Access Control

On login, the app sets two cookies:

- `session_email`
- `session_role`

Access control:

- `/user` requires a session email (normal user access to script editor)
- `/admin` requires session email + `session_role=admin`

The script executor is available to any authenticated user, regardless of role. This is the critical flaw.

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

### 1) Normal authentication

1. Log in with `user@demo.local` and `user123`
2. You are redirected to `/user` (the user dashboard with script editor)
3. Trying to open `/admin` redirects back to `/` (insufficient privileges)

### 2) Code injection attack

1. While logged in as the normal user, go to `/user`
2. In the **Script Editor** form, enter:

```javascript
const { getPool } = await import("@/lib/db");
const pool = getPool();
const res = await pool.query("SELECT * FROM users");
JSON.stringify(res.rows);
```

3. Click **Execute Script**
4. The script runs and returns all user records from the database, including the admin email and password
5. Now you can log in as admin using the stolen credentials

### 3) Escalation example

Using the same script editor, you can:

- Modify user roles: `UPDATE users SET role = 'admin' WHERE email = 'user@demo.local'`
- Drop tables: `DROP TABLE users`
- Insert backdoor accounts
- Execute any SQL statement with full database access

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

- `docker-compose.yml` maps host `5434 -> container 5432` to avoid conflict with an existing local Postgres on `5432`.
- The `db:seed` script uses `.env.local` and repopulates `users` deterministically.
- This repository intentionally demonstrates bad practices to teach secure coding.
