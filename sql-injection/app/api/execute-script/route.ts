import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";

// INTENTIONALLY VULNERABLE: Executes arbitrary SQL from authenticated user input.
// This demonstrates CVE-2026-0488 style impact (unauthorized critical functionality + DB compromise).
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("session_email")?.value;

  if (!sessionEmail) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized: Must be authenticated" },
      { status: 401 },
    );
  }

  const { sql } = (await request.json()) as { sql?: string };

  if (!sql || sql.trim() === "") {
    return NextResponse.json(
      { ok: false, message: "SQL statement cannot be empty" },
      { status: 400 },
    );
  }

  try {
    // INTENTIONALLY VULNERABLE: raw SQL from user input is executed directly.
    const queryResult = await getPool().query(sql);

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
