import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "brightloop-secure-jwt-secret-key-must-be-at-least-32-chars-long-123456";

const key = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "brightloop_session";

interface DecodedToken {
  userId: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  name: string;
}

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internals, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Read and verify session cookie
  const tokenCookie = request.cookies.get(COOKIE_NAME)?.value;
  let session: DecodedToken | null = null;

  if (tokenCookie) {
    try {
      const { payload } = await jwtVerify(tokenCookie, key, {
        algorithms: ["HS256"],
      });
      session = payload as unknown as DecodedToken;
    } catch {
      session = null;
    }
  }

  const isPublicRoute = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // 3. Unauthenticated user handling
  if (!session) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect unauthenticated requests to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated user visiting public auth routes (e.g., /login, /signup)
  if (isPublicRoute) {
    if (session.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Role-based access rules
  const { role } = session;

  // CUSTOMER can ONLY access /portal and /portal/*
  if (role === "CUSTOMER") {
    if (!pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  // STAFF & ADMIN are internal roles
  // If internal user navigates to /portal, redirect to internal dashboard
  if (pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // STAFF restrictions: cannot access /staff, /discounts, /taxes
  if (role === "STAFF") {
    const isStaffForbidden =
      pathname.startsWith("/staff") ||
      pathname.startsWith("/discounts") ||
      pathname.startsWith("/taxes");

    if (isStaffForbidden) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ADMIN can access all internal routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
