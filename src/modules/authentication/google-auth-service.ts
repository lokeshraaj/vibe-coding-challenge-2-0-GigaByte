import { User, Coach, Scout, Player, Academy } from "@/models";
import { connectToDatabase } from "@/lib/db/mongodb";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { signSessionToken } from "@/lib/auth/jwt";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "@/lib/errors";
import { AuthSessionPayload } from "@/types";

export interface GoogleAuthResponse {
  token: string;
  payload: AuthSessionPayload;
}

/**
 * Authenticates a user using a verified Firebase ID token from Google Sign-In.
 *
 * Invariants:
 * 1. Cryptographically verifies token signature, audience, issuer, and expiration.
 * 2. Requires verified Google email.
 * 3. Never auto-creates accounts or grants roles based on Google data.
 * 4. Matches strictly with existing MongoDB accounts by verified email.
 * 5. Rejects PENDING, DEACTIVATED, and BLOCKED accounts/tenants.
 * 6. Dynamically resolves assigned sport, coachId, playerId, and academyId.
 * 7. Issues standard ATHLIX session JWT token for cookie storage.
 */
export async function authenticateWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    throw new BadRequestError("Firebase ID token is required.");
  }

  // 1. Verify token with Firebase Admin SDK
  let decodedToken;
  try {
    decodedToken = await verifyFirebaseIdToken(idToken.trim());
  } catch (err: any) {
    const message = err?.message || "Firebase token verification failed";
    console.error("[Google Auth Error] Firebase token verification failed:", message);
    throw new UnauthorizedError("Invalid, expired, or revoked Google authentication token.");
  }

  if (!decodedToken || !decodedToken.email) {
    throw new UnauthorizedError("Google token does not contain a valid email address.");
  }

  // 2. Reject unverified Google email addresses
  if (!decodedToken.email_verified) {
    throw new UnauthorizedError("Your Google email is not verified. Please verify your Google account.");
  }

  const normalizedEmail = decodedToken.email.toLowerCase().trim();

  // 3. Connect to database
  await connectToDatabase();

  // 4. Find matching user in MongoDB
  const user = await User.findOne({ email: normalizedEmail });

  // Rule: If no ATHLIX account exists, do NOT create one automatically.
  // Must preserve strict identity, invite, and academy approval workflows.
  if (!user) {
    throw new NotFoundError(
      `No registered ATHLIX account found for ${normalizedEmail}. If you are an Academy Owner, please register your academy. If you are a Coach, Player, or Scout, please activate your account using your assigned ATHLIX ID.`
    );
  }

  // Rule: Pending accounts cannot bypass activation
  if (user.status === "PENDING") {
    throw new UnauthorizedError(
      "Your account is pending activation. Please complete initial setup and set your password using your assigned Coach ID or Player ID first."
    );
  }

  if (user.status === "DEACTIVATED") {
    throw new UnauthorizedError("Your account has been deactivated. Please contact support.");
  }

  if (user.status === "BLOCKED") {
    const reason = user.blockedReason ? `: ${user.blockedReason}` : ".";
    throw new ForbiddenError(`Your account has been blocked by Platform Administration${reason}`);
  }

  // Tenant-level blocking verification for non-platform admins
  if (user.role !== "PLATFORM_ADMIN" && user.role !== "SUPER_ADMIN" && user.academyId) {
    const academy = await Academy.findById(user.academyId);
    if (academy && academy.status === "BLOCKED") {
      const reason = academy.blockedReason ? `: ${academy.blockedReason}` : ".";
      throw new ForbiddenError(`Your sports academy tenant has been blocked by Platform Administration${reason}`);
    }
  }

  // 5. Account linking: preserve existing data, link avatar if missing, track last login
  const metadataUpdate: Record<string, any> = {
    "metadata.lastLoginAt": new Date(),
    "metadata.lastLoginMethod": "GOOGLE",
  };

  if (decodedToken.picture && (!user.metadata || !user.metadata.avatarUrl)) {
    metadataUpdate["metadata.avatarUrl"] = decodedToken.picture;
  }

  await User.findByIdAndUpdate(user._id, { $set: metadataUpdate });

  // 6. Dynamic role and sport resolution
  let coachId: string | undefined = user.coachId?.toString();
  let playerId: string | undefined = user.playerId?.toString();
  let sport: string | undefined;

  if (user.role === "COACH") {
    const coachDoc = await Coach.findOne({ userId: user._id });
    if (coachDoc) {
      sport = coachDoc.sport;
      if (!coachId) {
        coachId = coachDoc._id.toString();
      }
    }
  } else if (user.role === "SCOUT") {
    const scoutDoc = await Scout.findOne({ userId: user._id });
    if (scoutDoc) {
      if (scoutDoc.sport) {
        sport = scoutDoc.sport;
      } else if (scoutDoc.assignedCoachId) {
        const coachDoc = await Coach.findById(scoutDoc.assignedCoachId);
        if (coachDoc) sport = coachDoc.sport;
      }
      if (!coachId && scoutDoc.assignedCoachId) {
        coachId = scoutDoc.assignedCoachId.toString();
      }
    }
  } else if (user.role === "PLAYER") {
    const playerDoc = await Player.findOne({ userId: user._id });
    if (playerDoc) {
      sport = playerDoc.sport;
      if (!playerId) {
        playerId = playerDoc._id.toString();
      }
    }
  }

  // 7. Generate session payload and sign JWT
  const payload: AuthSessionPayload = {
    userId: user._id.toString(),
    role: user.role,
    academyId: user.academyId ? user.academyId.toString() : undefined,
    coachId,
    playerId,
    sport,
    name: user.name,
    email: user.email,
  };

  const token = await signSessionToken(payload);

  return { token, payload };
}
