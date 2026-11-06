import { User, Coach, Scout, Player, Academy } from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/lib/errors";
import { AuthSessionPayload } from "@/types";

export interface LoginInput {
  academyCode?: string;
  email?: string;
  identifier?: string;
  password: string;
}

export async function loginUser(input: LoginInput): Promise<{
  token: string;
  payload: AuthSessionPayload;
}> {
  const rawIdentifier = (input.identifier || input.email || "").trim();
  let user = null;

  if (rawIdentifier.includes("@")) {
    // Email-based authentication (Platform Admin, Super Admin, Academy Owner, or Coach/Player using direct email)
    user = await User.findOne({ email: rawIdentifier.toLowerCase() }).select("+passwordHash");

    if (input.academyCode && input.academyCode.trim()) {
      const cleanAcademyCode = input.academyCode.trim().toUpperCase();
      const academy = await Academy.findOne({ academyCode: cleanAcademyCode });
      if (!academy) {
        throw new UnauthorizedError("Invalid Academy Code or credentials.");
      }
      if (user && user.academyId && user.academyId.toString() !== academy._id.toString()) {
        throw new UnauthorizedError("Invalid credentials for this academy.");
      }
    }
  } else {
    // Individual ID authentication (Coach ID, Player ID, Scout ID)
    // Strictly requires Academy Code for tenant isolation
    if (!input.academyCode || !input.academyCode.trim()) {
      throw new UnauthorizedError("Academy Code is required when logging in with a Coach or Player ID.");
    }

    const cleanAcademyCode = input.academyCode.trim().toUpperCase();
    const academy = await Academy.findOne({ academyCode: cleanAcademyCode });
    if (!academy) {
      throw new UnauthorizedError("Invalid Academy Code. Please check the code provided by your academy.");
    }

    const cleanId = rawIdentifier.toUpperCase();

    // 1. Check if ATHLIX Coach ID scoped strictly to this academyId
    const coach = await Coach.findOne({
      academyId: academy._id,
      coachCode: cleanId,
    });

    if (coach && coach.userId) {
      user = await User.findOne({ _id: coach.userId, academyId: academy._id }).select("+passwordHash");
    } else {
      // 2. Check if ATHLIX Player ID scoped strictly to this academyId
      const player = await Player.findOne({
        academyId: academy._id,
        playerCode: cleanId,
      });

      if (player && player.userId) {
        user = await User.findOne({ _id: player.userId, academyId: academy._id }).select("+passwordHash");
      } else {
        // 3. Check if ATHLIX Scout ID scoped strictly to this academyId
        const scout = await Scout.findOne({
          academyId: academy._id,
          scoutCode: cleanId,
        });

        if (scout && scout.userId) {
          user = await User.findOne({ _id: scout.userId, academyId: academy._id }).select("+passwordHash");
        }
      }
    }
  }

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid credentials. Please verify your Academy Code, ID and password.");
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
    throw new UnauthorizedError("Invalid credentials. Please verify your credentials and password.");
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
