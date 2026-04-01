import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";

type QueryLog = {
  id: number;
  executed_at: string;
  executed_by: string;
  query_text: string;
  success: boolean;
  rows_affected: number;
};

// INTENTIONALLY VULNERABLE: Logs are accessible to any authenticated user
// Attackers can view AND delete logs to cover their tracks
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("session_email")?.value;

  if (!sessionEmail) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized: Must be authenticated" },
      { status: 401 },
    );
  }

  try {
    const result = await getPool().query<QueryLog>(
      `SELECT id, executed_at, executed_by, query_text, success, rows_affected
       FROM query_logs ORDER BY id DESC LIMIT 50`,
    );

    return NextResponse.json({
      ok: true,
      logs: result.rows,
      message:
        "Query logs retrieved (WARNING: Attackers can see and delete these logs!)",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to retrieve logs",
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
