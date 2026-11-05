import { User, Coach, Scout, Player } from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/lib/errors";
import { AuthSessionPayload } from "@/types";

export interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput): Promise<{
  token: string;
  payload: AuthSessionPayload;
}> {
  const rawIdentifier = (input.email || "").trim();
  let user = null;

  if (rawIdentifier.includes("@")) {
    user = await User.findOne({ email: rawIdentifier.toLowerCase() }).select("+passwordHash");
  } else {
    const cleanId = rawIdentifier.toUpperCase();
    // 1. Check if ATHLIX Coach ID
    const coach = await Coach.findOne({ coachCode: cleanId });
    if (coach && coach.userId) {
      user = await User.findById(coach.userId).select("+passwordHash");
    } else {
      // 2. Check if ATHLIX Player ID
      const player = await Player.findOne({ playerCode: cleanId });
      if (player && player.userId) {
        user = await User.findById(player.userId).select("+passwordHash");
      }
    }
  }

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid credentials. Please verify your email / ATHLIX ID and password.");
  }

  if (user.status === "PENDING") {
    throw new UnauthorizedError(
      "Your account is pending activation. Please complete registration using your assigned Coach ID or Player ID."
    );
  }

  if (user.status === "DEACTIVATED") {
    throw new UnauthorizedError("Your account has been deactivated. Please contact support.");
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid credentials. Please verify your email / ATHLIX ID and password.");
  }

  let coachId: string | undefined = user.coachId?.toString();
  let playerId: string | undefined = user.playerId?.toString();

  // If coach or scout, ensure coach link is resolved
  if (user.role === "COACH" && !coachId) {
    const coachRecord = await Coach.findOne({ userId: user._id });
    if (coachRecord) {
      coachId = coachRecord._id.toString();
    }
  } else if (user.role === "SCOUT") {
    const scoutRecord = await Scout.findOne({ userId: user._id });
    if (scoutRecord) {
      coachId = scoutRecord.assignedCoachId.toString();
    }
  }

  // Update last login
  user.metadata = {
    ...user.metadata,
    lastLoginAt: new Date(),
  };
  await user.save();

  const payload: AuthSessionPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    academyId: user.academyId?.toString(),
    coachId,
    playerId,
  };

  const token = await signSessionToken(payload);

  return {
    token,
    payload,
  };
}
