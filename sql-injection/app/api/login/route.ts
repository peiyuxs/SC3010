import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type UserRow = {
  email: string;
  role: "admin" | "user";
};

// ============================================================================
// CONTRAST: SECURE Implementation (Defensive Code Example)
// ============================================================================
// This endpoint uses PARAMETERIZED QUERIES to prevent SQL injection.
// Compare this to /api/execute-script which is INTENTIONALLY VULNERABLE.
//
// SECURITY: Why this is SAFE
// - User input (email, password) is passed as PARAMETERS ($1, $2), NOT interpolated
// - Database driver handles all escaping - developer never sees SQL string generation
// - Even if attacker enters: " OR 1=1 --
//   The query still looks for user with that EXACT email string, not SQL syntax
//
// SECURITY: Why /api/execute-script is DANGEROUS
// - User SQL is directly executed: await query(sql)  [WHERE sql is user input]
// - If attacker enters: " OR 1=1 LIMIT 1000 --
//   This becomes part of the SQL SYNTAX, not a string value
// ============================================================================

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 },
    );
  }

  // ✅ SECURE: Uses parameterized query with $1, $2 placeholders
  // The database driver (node-postgres) automatically escapes these parameters
  // Attackers cannot break out of the "string value" context
  //
  // Example protection:
  // Input: admin' OR '1'='1
  // What gets searched: Literal string "admin' OR '1'='1" (not SQL syntax)
  // Result: No match found (correct behavior)
  const query = `
    SELECT email, role
    FROM users
    WHERE email = $1 AND password = $2
    ORDER BY id ASC
    LIMIT 1
  `;

  try {
    // ✅ Parameters passed separately - never interpolated into query string
    // The [email, password] array tells the database: "These are string values, not SQL"
    const result = await getPool().query<UserRow>(query, [email, password]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }

    const user = result.rows[0];
    const response = NextResponse.json({
      ok: true,
      role: user.role,
      email: user.email,
    });

    // ✅ SECURE: Set httpOnly cookies so JavaScript cannot access session tokens
    // ✅ SECURE: Set sameSite=lax to mitigate CSRF attacks
    response.cookies.set("session_email", user.email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("session_role", user.role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Database error while checking credentials." },
      { status: 500 },
    );
  }
}
