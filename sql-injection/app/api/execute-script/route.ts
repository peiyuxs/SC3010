import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";

// ============================================================================
// CVE-2026-0488 DEMONSTRATION: Code Injection → SQL Execution Vulnerability
// ============================================================================
// This endpoint demonstrates how an authenticated attacker can escalate
// privileges from "standard user" to "database admin" via unrestricted SQL.
//
// VULNERABILITY ANALYSIS:
// 1. Authentication Check (Line 8-14): ✓ Correctly enforces session requirement
// 2. Input Validation (Line 16-22): ✗ ONLY checks for empty string, not SQL syntax/content
// 3. SQL Execution (Line 25): ✗ CRITICAL: Raw user input directly in query - NO parameterization
// 4. Logging (Line 27-35): ✓ Logs all queries, BUT logs are readable/deletable by attacker
//
// ATTACK CHAIN:
// Step 1: User logs in (parameterized query protects login)
// Step 2: User navigates to /user dashboard (middleware allows auth'd users)
// Step 3: User executes SQL payload: UPDATE users SET role='admin' WHERE email='user@example.com'
// Step 4: Database updated - user now has admin role in DB
// Step 5: User queries query_logs via API to see execution history
// Step 6: User deletes their own query logs: DELETE FROM query_logs WHERE executed_by=current_user
// Step 7: Admin has no forensic evidence of privilege escalation
// ============================================================================

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("session_email")?.value;

  // ✓ SECURE: Check authentication - endpoint requires valid session
  if (!sessionEmail) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized: Must be authenticated" },
      { status: 401 },
    );
  }

  const { sql } = (await request.json()) as { sql?: string };

  // ✗ INSUFFICIENT: Only checks if SQL is empty, doesn't validate content
  // SHOULD: Use allowlist approach - only allow SELECT, INSERT with specific tables
  // SHOULD: Use prepared statements with parameterized queries
  if (!sql || sql.trim() === "") {
    return NextResponse.json(
      { ok: false, message: "SQL statement cannot be empty" },
      { status: 400 },
    );
  }

  try {
    // ❌ INTENTIONALLY VULNERABLE: Raw SQL execution without ANY parameterization
    // The 'sql' variable comes directly from user input and is never escaped/sanitized
    //
    // WRONG APPROACH (current):
    //   const result = await getPool().query(sql);  // ❌ Direct interpolation
    //
    // CORRECT APPROACH (needed for production):
    //   const result = await getPool().query('SELECT * FROM users WHERE role=$1', ['admin']);
    //   // Parameters passed separately - database driver handles escaping
    //
    // IMPACT: Attacker can craft SQL like:
    //   - DROP TABLE users; (availability)
    //   - SELECT * FROM users; (confidentiality)
    //   - UPDATE users SET role='admin'; (integrity)
    //   - DELETE FROM query_logs; (forensic evasion)
    const queryResult = await getPool().query(sql);

    // Log the query execution
    // SECURITY NOTE: These logs are readable (via /api/query-logs) AND deletable by the
    // authenticated user. This demonstrates a second vulnerability: audit log tampering.
    //
    // ATTACKER CAN:
    // 1. View all their executed queries via GET /api/query-logs
    // 2. Identify which SQL statements were logged
    // 3. Execute: DELETE FROM query_logs WHERE executed_by = current_user;
    // 4. Result: Complete forensic evasion - admin cannot trace the attack
    //
    // PROPER DEFENSE:
    // - Store audit logs in SEPARATE immutable database
    // - Make logs append-only (no DELETE permissions even for admins)
    // - Use cryptographic signing so tampering is detectable
    // - Forward to external SIEM system
    const currentUserEmail =
      cookieStore.get("session_email")?.value || "unknown";
    await getPool().query(
      `INSERT INTO query_logs (executed_by, query_text, success, rows_affected)
       VALUES ($1, $2, $3, $4)`,
      [currentUserEmail, sql, true, queryResult.rowCount],
    );

    return NextResponse.json({
      ok: true,
      result: {
        command: queryResult.command,
        rowCount: queryResult.rowCount,
        rows: queryResult.rows,
      },
      warning:
        "SQL executed successfully. This endpoint intentionally allows arbitrary SQL execution.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log failed queries too (they still leave traces in the audit log!)
    // Attackers can see which SQL failed (helps them refine their payloads)
    const currentUserEmail =
      cookieStore.get("session_email")?.value || "unknown";
    await getPool()
      .query(
        `INSERT INTO query_logs (executed_by, query_text, success, rows_affected)
         VALUES ($1, $2, $3, $4)`,
        [currentUserEmail, sql, false, 0],
      )
      .catch(() => {
        /* ignore log errors */
      });

    return NextResponse.json(
      {
        ok: false,
        message: "SQL execution failed",
        error: errorMessage,
      },
      { status: 400 },
    );
  }
}
