import { User, Coach, Scout } from "@/models";
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
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status === "DEACTIVATED") {
    throw new UnauthorizedError("Your account has been deactivated. Please contact support.");
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
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

  return { token, payload };
}
