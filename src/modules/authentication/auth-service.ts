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

  if (!user) {
    throw new UnauthorizedError("Invalid credentials. Please verify your email / ATHLIX ID and password.");
  }

  if (user.status === "PENDING") {
    throw new UnauthorizedError(
      "Your account is pending activation. Please complete initial setup and set your password using your assigned Coach ID or Player ID."
    );
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError("Invalid credentials. Please verify your email / ATHLIX ID and password.");
  }

  if (user.status === "DEACTIVATED") {
    throw new UnauthorizedError("Your account has been deactivated. Please contact support.");
  }

  if (user.status === "BLOCKED") {
    const reason = user.blockedReason ? `: ${user.blockedReason}` : ".";
    throw new UnauthorizedError(`Your account has been blocked by Platform Administration${reason}`);
  }

  // Tenant blocking verification for non-platform admins
  if (user.role !== "PLATFORM_ADMIN" && user.role !== "SUPER_ADMIN" && user.academyId) {
    const academy = await Academy.findById(user.academyId);
    if (academy && academy.status === "BLOCKED") {
      const reason = academy.blockedReason ? `: ${academy.blockedReason}` : ".";
      throw new UnauthorizedError(`Your sports academy tenant has been blocked by Platform Administration${reason}`);
    }
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid credentials. Please verify your email / ATHLIX ID and password.");
  }

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

  // Update last login timestamp without blocking response
  User.findByIdAndUpdate(user._id, { "metadata.lastLoginAt": new Date() }).exec().catch(() => {});

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
