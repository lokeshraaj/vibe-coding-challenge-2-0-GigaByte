import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { auth } from "@/auth";
import { AuthSessionPayload, UserRole } from "@/types";
import {
  UnauthorizedError,
  ForbiddenError,
  TenantIsolationError,
  isDatabaseError,
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
          sport: u.sport,
        };
      }
    }
  } catch (err) {
    if (isDatabaseError(err)) {
      throw err;
    }
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
 * Strictly enforces SUPER_ADMIN role (e.g. For destructive operations, cascade delete, platform configuration).
 */
export async function requireSuperAdmin(req?: Request): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);
  if (session.role !== "SUPER_ADMIN") {
    throw new ForbiddenError(
      `Access denied. Primary Super Admin privileges are required for this operation.`
    );
  }
  return session;
}

/**
 * Enforces Platform Admin access (SUPER_ADMIN or PLATFORM_ADMIN with optional permission check).
 */
export async function requirePlatformAdmin(
  req?: Request,
  requiredPermission?: string
): Promise<AuthSessionPayload> {
  const session = await requireAuth(req);

  if (session.role !== "SUPER_ADMIN" && session.role !== "PLATFORM_ADMIN") {
    throw new ForbiddenError(
      "Access denied. Platform administrative privileges are required for this action."
    );
  }

  if (requiredPermission && session.role === "PLATFORM_ADMIN") {
    const { User } = await import("@/models");
    const userDoc = await User.findById(session.userId).select("adminPermissions").lean();
    const permissions: string[] = (userDoc as any)?.adminPermissions || [];
    if (!permissions.includes(requiredPermission) && !permissions.includes("ALL")) {
      throw new ForbiddenError(
        `Access denied. Platform admin is missing required permission: '${requiredPermission}'.`
      );
    }
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

/**
 * Resolves the authenticated user's assigned sport strictly from trusted database records.
 * - For COACH: returns coach.sport
 * - For SCOUT: returns scout.sport (or assignedCoach.sport)
 * - For PLAYER: returns player.sport
 * - For ACADEMY_OWNER / SUPER_ADMIN / PLATFORM_ADMIN: returns null (unrestricted multi-sport)
 */
export async function resolveUserSport(session: AuthSessionPayload): Promise<string | null> {
  if (
    session.role === "PLATFORM_ADMIN" ||
    session.role === "SUPER_ADMIN" ||
    session.role === "ACADEMY_OWNER"
  ) {
    return null;
  }

  // If verified sport is already embedded in cryptographically signed JWT session token
  if (session.sport) {
    return session.sport;
  }

  const mongoose = (await import("mongoose")).default;
  const { Coach, Scout, Player } = await import("@/models");

  if (session.role === "COACH") {
    let coachDoc = null;
    const isValidAcademyId = session.academyId && mongoose.Types.ObjectId.isValid(session.academyId);
    if (session.coachId && mongoose.Types.ObjectId.isValid(session.coachId)) {
      const q: any = { _id: session.coachId };
      if (isValidAcademyId) q.academyId = session.academyId;
      coachDoc = await Coach.findOne(q).select("sport");
    }
    if (!coachDoc && session.userId && mongoose.Types.ObjectId.isValid(session.userId)) {
      const q: any = { userId: session.userId };
      if (isValidAcademyId) q.academyId = session.academyId;
      coachDoc = await Coach.findOne(q).select("sport");
    }
    if (!coachDoc || !coachDoc.sport) {
      throw new ForbiddenError("No assigned sport found for this coach profile.");
    }
    return coachDoc.sport;
  }

  if (session.role === "SCOUT") {
    let scoutDoc = null;
    const isValidAcademyId = session.academyId && mongoose.Types.ObjectId.isValid(session.academyId);
    if (session.userId && mongoose.Types.ObjectId.isValid(session.userId)) {
      const q: any = { userId: session.userId };
      if (isValidAcademyId) q.academyId = session.academyId;
      scoutDoc = await Scout.findOne(q)
        .populate("assignedCoachId", "sport")
        .select("sport assignedCoachId");
    }

    if (!scoutDoc) {
      throw new ForbiddenError("No scout profile associated with this account.");
    }

    const assignedCoach = scoutDoc.assignedCoachId as any;
    const scoutSport = scoutDoc.sport || assignedCoach?.sport;

    if (!scoutSport) {
      throw new ForbiddenError("No assigned sport found for this scout profile.");
    }
    return scoutSport;
  }

  if (session.role === "PLAYER") {
    let playerDoc = null;
    const isValidAcademyId = session.academyId && mongoose.Types.ObjectId.isValid(session.academyId);
    if (session.playerId && mongoose.Types.ObjectId.isValid(session.playerId)) {
      const q: any = { _id: session.playerId };
      if (isValidAcademyId) q.academyId = session.academyId;
      playerDoc = await Player.findOne(q).select("sport");
    }
    if (!playerDoc && session.userId && mongoose.Types.ObjectId.isValid(session.userId)) {
      const q: any = { userId: session.userId };
      if (isValidAcademyId) q.academyId = session.academyId;
      playerDoc = await Player.findOne(q).select("sport");
    }
    if (!playerDoc || !playerDoc.sport) {
      throw new ForbiddenError("No assigned sport found for this player profile.");
    }
    return playerDoc.sport;
  }

  return null;
}

/**
 * Validates that the requested resource sport strictly matches the user's assigned sport.
 * If user is unrestricted (Academy Owner, Platform Admin), returns resourceSport or null.
 * If user is restricted (Coach, Scout, Player) and resourceSport does not match, throws ForbiddenError.
 */
export async function requireSportAccess(
  session: AuthSessionPayload,
  resourceSport?: string
): Promise<string | null> {
  const assignedSport = await resolveUserSport(session);

  // Unrestricted multi-sport roles
  if (assignedSport === null) {
    return resourceSport || null;
  }

  if (resourceSport) {
    if (resourceSport.trim().toLowerCase() !== assignedSport.trim().toLowerCase()) {
      throw new ForbiddenError(
        `Access denied: You are restricted to your assigned sport (${assignedSport}) and cannot access ${resourceSport} data.`
      );
    }
  }

  return assignedSport;
}
