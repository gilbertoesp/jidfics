import { NextResponse } from "next/server";
import { auth } from "@/auth";

// TODO(auth): replace the hardcoded matcher with an explicit route-policy
// table (PUBLIC | AUTHED | ROLE) so new routes are deny-by-default.
export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/auth/login";

  // If authenticated and trying to access login page, redirect to protected
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/protected", req.url));
  }

  // If not authenticated and trying to access protected path
  if (!isAuthenticated && req.nextUrl.pathname.startsWith("/protected")) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Continue
  return NextResponse.next();
});

export const config = {
  matcher: ["/protected/:path*", "/auth/login"],
};
