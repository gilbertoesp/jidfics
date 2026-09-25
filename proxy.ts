import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decideGate } from "@/lib/auth/gate";

export default auth(async (req) => {
  const decision = decideGate({
    pathname: req.nextUrl.pathname,
    method: req.method,
    isAuthenticated: Boolean(req.auth),
    role: req.auth?.user?.role ?? null,
  });

  switch (decision.action) {
    case "next":
      return NextResponse.next();
    case "away-from-login":
      return NextResponse.redirect(new URL("/protected", req.url));
    case "login": {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", decision.callbackUrl);
      return NextResponse.redirect(loginUrl);
    }
    case "forbidden":
      return new NextResponse(null, { status: 403 });
    case "not-found":
      return new NextResponse(null, { status: 404 });
  }
});

export const config = {
  // Deny-by-default: the gate sees every route-handler request; static build
  // assets are excluded here and are also declared public in lib/auth/policy.ts.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
