import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const JWT_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "brightloop-secure-jwt-secret-key-must-be-at-least-32-chars-long-123456";

const key = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = "brightloop_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
}

/**
 * Sign a new JWT session token valid for 7 days
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

/**
 * Sets session cookie in response headers (for Server Actions / Route Handlers)
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clears session cookie (Logout)
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the current authenticated user from cookie & database
 */
export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Guard helper for Server Actions & API routes.
 * Ensures caller is logged in and possesses one of the allowed roles.
 */
export async function requireRole(...roles: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    throw new Error(
      `FORBIDDEN: Insufficient permissions. Required one of: [${roles.join(", ")}], but user is [${user.role}]`
    );
  }

  return user;
}
