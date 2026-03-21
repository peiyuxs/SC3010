import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.delete("session_email");
  response.cookies.delete("session_role");

  return response;
}
