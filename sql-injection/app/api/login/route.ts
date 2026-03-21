import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

type UserRow = {
  email: string;
  role: "admin" | "user";
};

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

  // INTENTIONALLY VULNERABLE: raw string interpolation, no parameterized query.
  const query = `
    SELECT email, role
    FROM users
    WHERE email = '${email}' AND password = '${password}'
    ORDER BY id ASC
    LIMIT 1
  `;

  try {
    const result = await getPool().query<UserRow>(query);

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
