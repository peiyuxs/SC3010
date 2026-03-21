import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const email = request.cookies.get("session_email")?.value;
  const role = request.cookies.get("session_role")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/user") && !email) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/admin") && (!email || role !== "admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};
