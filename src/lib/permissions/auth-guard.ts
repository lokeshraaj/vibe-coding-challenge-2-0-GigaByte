import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { auth } from "@/auth";
import { AuthSessionPayload, UserRole } from "@/types";
import {
  UnauthorizedError,
  ForbiddenError,
  TenantIsolationError,
} from "@/lib/errors";

/**
 * Extracts session from Auth.js session, request cookies, or next/headers cookies.
 */
export async function getAuthSession(req?: Request): Promise<AuthSessionPayload | null> {
  // 1. Check Auth.js session (Google OAuth & Auth.js sessions)
  try {
    const nextAuthSession = await auth();
    if (nextAuthSession && nextAuthSession.user) {
      const u = nextAuthSession.user as any;
      if (u.id || u.email) {
        return {
          userId: u.id || "",
          email: u.email || "",
          name: u.name || "User",
          role: u.role || "PLAYER",
          academyId: u.academyId,
          coachId: u.coachId,
          playerId: u.playerId,
        };
      }
    }
  } catch {
    // In non-auth context or test environments
  }

  // 2. Check athlix_session cookie (custom credentials token)
  let token: string | undefined;

  if (req) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      if (match) {
        token = match.split("=")[1];
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // In non-request context or test environment
    }
  }

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Enforces authenticated session. Throws 401 if missing.
 */
export async function requireAuth(req?: Request): Promise<AuthSessionPayload> {
  const session = await getAuthSession(req);
  if (!session || !session.userId) {
    throw new UnauthorizedError("Authentication required to access this resource");
  }
  return session;
}

/**
 * Enforces role-based access. Throws 403 if role unauthorized.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  req?: Request
): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);

  const allowedSet = new Set<string>(allowedRoles);
  if (allowedSet.has("PLATFORM_ADMIN") || allowedSet.has("SUPER_ADMIN")) {
    allowedSet.add("PLATFORM_ADMIN");
    allowedSet.add("SUPER_ADMIN");
  }

  if (!allowedSet.has(session.role)) {
    throw new ForbiddenError(
      `Access denied. Role '${session.role}' is not authorized for this action.`
    );
  }

  return session;
}

/**
 * Enforces tenant boundary. Platform super admin can access all academies.
 * Academy owners, coaches, scouts, and players can only access their own academy.
 */
export async function requireAcademyAccess(
  targetAcademyId?: string,
  req?: Request
): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);

  if (session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN") {
    return session;
  }

  if (!session.academyId) {
    throw new TenantIsolationError("User has no associated academy tenant.");
  }

  if (targetAcademyId && targetAcademyId !== session.academyId) {
    throw new TenantIsolationError("Cross-tenant access violation: Unauthorized academy scope.");
  }

  return session;
}

/**
 * Enforces coach data isolation.
 * Coach can only access resources belonging to their coachId.
 * Academy Owner can access any coach in their academy.
 * Platform Admin can access any coach.
 */
export async function requireCoachAccess(
  targetCoachId?: string,
  req?: Request
): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);

  if (session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN") {
    return session;
  }

  if (session.role === "ACADEMY_OWNER") {
    return session;
  }

  if (session.role === "COACH") {
    if (!session.coachId) {
      throw new ForbiddenError("No coach profile associated with this account.");
    }
    if (targetCoachId && targetCoachId !== session.coachId) {
      throw new ForbiddenError("Unauthorized: Coaches can only access their own assigned data.");
    }
    return session;
  }

  throw new ForbiddenError("Only coaches and academy owners can perform coach-level operations.");
}

/**
 * Enforces scout data isolation.
 * Scout can only access players belonging to their assigned coach.
 */
export async function requireScoutAccess(
  targetCoachId?: string,
  req?: Request
): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);

  if (
    session.role === "PLATFORM_ADMIN" ||
    session.role === "SUPER_ADMIN" ||
    session.role === "ACADEMY_OWNER"
  ) {
    return session;
  }

  if (session.role === "SCOUT") {
    if (!session.coachId) {
      throw new ForbiddenError("No assigned coach associated with this scout account.");
    }
    if (targetCoachId && targetCoachId !== session.coachId) {
      throw new ForbiddenError("Unauthorized: Scouts can only access players from their assigned coach.");
    }
    return session;
  }

  throw new ForbiddenError("Unauthorized: Scout access required.");
}
