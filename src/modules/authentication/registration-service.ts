import mongoose from "mongoose";
import { SignJWT, jwtVerify } from "jose";
import { Coach, Player, User, OtpChallenge, AuditLog, Academy } from "@/models";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/email/brevo";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  AppError,
} from "@/lib/errors";

const ACTIVATION_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "athlix-activation-temp-secret-2026-key"
);

export interface ActivationPayload {
  athlixId: string;
  email: string;
  role: "COACH" | "PLAYER";
  challengeId: string;
  academyId?: string;
  academyCode?: string;
}

export async function signActivationToken(payload: ActivationPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(ACTIVATION_SECRET);
}

export async function verifyActivationToken(token: string): Promise<ActivationPayload> {
  try {
    const { payload } = await jwtVerify(token, ACTIVATION_SECRET);
    return payload as unknown as ActivationPayload;
  } catch {
    throw new UnauthorizedError("Activation token has expired or is invalid. Please restart registration.");
  }
}

/**
 * Step 1 & 2: Verify Academy Code & ATHLIX ID, and dispatch Brevo OTP email.
 */
export async function initiateIdRegistration(params: {
  academyCode?: string;
  athlixId: string;
  role: "COACH" | "PLAYER";
  ipAddress?: string;
}) {
  const cleanId = params.athlixId.trim().toUpperCase();
  let academy = null;

  if (params.academyCode && params.academyCode.trim()) {
    const cleanAcademyCode = params.academyCode.trim().toUpperCase();
    academy = await Academy.findOne({ academyCode: cleanAcademyCode });
    if (!academy) {
      throw new NotFoundError("Invalid Academy Code. Please check the code provided by your academy.");
    }
  }

  let recipientEmail = "";
  let recipientName = "";
  let resolvedAcademyId: mongoose.Types.ObjectId | null = academy ? (academy._id as mongoose.Types.ObjectId) : null;

  if (params.role === "COACH") {
    const query: Record<string, unknown> = { coachCode: cleanId };
    if (resolvedAcademyId) {
      query.academyId = resolvedAcademyId;
    }

    const coach = await Coach.findOne(query).populate("userId", "name email status");
    if (!coach) {
      throw new NotFoundError(
        resolvedAcademyId
          ? "Invalid Coach ID for this academy. Please check the ID provided by your academy administrator."
          : "Invalid Coach ID. Please check the ID provided by your academy."
      );
    }

    if (!resolvedAcademyId && coach.academyId) {
      resolvedAcademyId = coach.academyId;
      academy = await Academy.findById(resolvedAcademyId);
    }

    if (coach.accountStatus === "ACTIVE") {
      throw new ConflictError("This coach account has already been activated. Please proceed to the login page.");
    }

    const u = coach.userId as unknown as { name: string; email: string; status: string };
    if (!u || !u.email) {
      throw new NotFoundError("No user record found for this coach.");
    }

    if (u.status === "ACTIVE") {
      throw new ConflictError("This coach account has already been activated. Please proceed to the login page.");
    }

    recipientEmail = u.email;
    recipientName = u.name;
  } else {
    // Player lookup
    const query: Record<string, unknown> = { playerCode: cleanId };
    if (resolvedAcademyId) {
      query.academyId = resolvedAcademyId;
    }

    const player = await Player.findOne(query);
    if (!player) {
      throw new NotFoundError(
        resolvedAcademyId
          ? "Invalid Player ID for this academy. Please check the ID provided by your coach."
          : "Invalid Player ID. Please check the ID provided by your academy."
      );
    }

    if (!resolvedAcademyId && player.academyId) {
      resolvedAcademyId = player.academyId;
      academy = await Academy.findById(resolvedAcademyId);
    }

    if (player.accountStatus === "ACTIVE") {
      throw new ConflictError("This athlete account has already been activated. Please proceed to the login page.");
    }

    if (!player.contact?.email) {
      throw new ValidationError("No email address was registered for this athlete. Please ask your coach to register your email.");
    }

    const existingUser = await User.findOne({ email: player.contact.email.toLowerCase().trim() });
    if (existingUser && existingUser.status === "ACTIVE") {
      throw new ConflictError("This athlete account has already been activated. Please proceed to the login page.");
    }

    recipientEmail = player.contact.email;
    recipientName = player.name;
  }

  // Rate Limiting & 60-second Resend Cooldown
  const latestChallenge = await OtpChallenge.findOne({ identifier: cleanId }).sort({ createdAt: -1 });
  if (latestChallenge && !latestChallenge.consumedAt) {
    const timeSinceLast = Date.now() - new Date(latestChallenge.createdAt).getTime();
    if (timeSinceLast < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - timeSinceLast) / 1000);
      throw new AppError(`Please wait ${waitSeconds} seconds before requesting a new OTP.`, 429);
    }
  }

  // Hourly Rate Limit: Max 5 OTP requests per hour per ATHLIX ID
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await OtpChallenge.countDocuments({
    identifier: cleanId,
    createdAt: { $gte: oneHourAgo },
  });
  if (hourlyCount >= 5) {
    throw new AppError("Too many OTP requests for this account. Please wait before requesting another code.", 429);
  }

  // Generate cryptographically secure 6-digit OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(rawOtp);

  // Invalidate any active, unconsumed challenges for this ID
  await OtpChallenge.updateMany(
    { identifier: cleanId, consumedAt: null },
    { $set: { consumedAt: new Date(0) } } // mark superseded
  );

  // Save new challenge in MongoDB (5-minute expiration, 5 verification attempts max)
  const challenge = await OtpChallenge.create({
    identifier: cleanId,
    email: recipientEmail.toLowerCase().trim(),
    role: params.role,
    otpHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    ipAddress: params.ipAddress || "",
  });

  // Dispatch OTP email via Brevo
  const emailResult = await sendOtpEmail({
    toEmail: recipientEmail,
    recipientName,
    otpCode: rawOtp,
    role: params.role,
    athlixId: cleanId,
    academyCode: academy?.academyCode,
  });

  // Verify Brevo API acceptance: Never show a false success message if email delivery fails
  if (!emailResult.success) {
    // Rollback challenge so an undelivered OTP does not lock the user out or linger
    await OtpChallenge.deleteOne({ _id: challenge._id });
    console.error("[Brevo OTP Dispatch Failed]", emailResult.error);
    throw new AppError("Failed to deliver verification email. Please try again shortly.", 502);
  }

  return {
    success: true,
    athlixId: cleanId,
    academyCode: academy?.academyCode || "",
    academyName: academy?.name || "",
    role: params.role,
    maskedEmail: maskEmail(recipientEmail),
    expiresAt: challenge.expiresAt,
  };
}

/**
 * Step 4: Verify 6-digit OTP.
 */
export async function verifyRegistrationOtp(params: {
  athlixId: string;
  otp: string;
  academyCode?: string;
}) {
  const cleanId = params.athlixId.trim().toUpperCase();

  const challenge = await OtpChallenge.findOne({
    identifier: cleanId,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!challenge) {
    throw new UnauthorizedError("No active verification code found. Please request a new OTP.");
  }

  if (new Date() > new Date(challenge.expiresAt)) {
    throw new UnauthorizedError("This verification code has expired (5-minute limit). Please request a new OTP.");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new UnauthorizedError("Too many incorrect attempts. This code has been invalidated. Please request a new OTP.");
  }

  const isValid = verifyOtp(params.otp, challenge.otpHash);
  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    const remaining = challenge.maxAttempts - challenge.attempts;
    if (remaining <= 0) {
      throw new UnauthorizedError("Too many incorrect attempts. This code is invalidated. Please request a new OTP.");
    }
    throw new UnauthorizedError(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
  }

  // Resolve academy context if available
  let academyId: string | undefined = undefined;
  let academyCode: string | undefined = params.academyCode?.trim().toUpperCase();

  if (academyCode) {
    const acad = await Academy.findOne({ academyCode });
    if (acad) {
      academyId = acad._id.toString();
    }
  }

  // Issue activation token valid for 10 minutes to proceed to Set Password screen
  const activationToken = await signActivationToken({
    athlixId: cleanId,
    email: challenge.email,
    role: challenge.role,
    challengeId: challenge._id.toString(),
    academyId,
    academyCode,
  });

  return {
    success: true,
    activationToken,
  };
}

/**
 * Resend OTP with strict 60s cooldown enforcement.
 */
export async function resendRegistrationOtp(params: {
  athlixId: string;
  academyCode?: string;
  ipAddress?: string;
}) {
  const cleanId = params.athlixId.trim().toUpperCase();

  const latestChallenge = await OtpChallenge.findOne({ identifier: cleanId }).sort({ createdAt: -1 });
  if (!latestChallenge) {
    throw new NotFoundError("Registration session not found. Please start over.");
  }

  return initiateIdRegistration({
    athlixId: cleanId,
    academyCode: params.academyCode,
    role: latestChallenge.role,
    ipAddress: params.ipAddress,
  });
}

/**
 * Step 5 & 6: Set Password and Activate Account.
 */
export async function completeAccountActivation(params: {
  activationToken: string;
  password: string;
  ipAddress?: string;
}) {
  const payload = await verifyActivationToken(params.activationToken);

  const challenge = await OtpChallenge.findById(new mongoose.Types.ObjectId(payload.challengeId));
  if (!challenge || challenge.consumedAt) {
    throw new UnauthorizedError("This verification session has already been used or expired.");
  }

  const hashedPassword = await hashPassword(params.password);
  let userIdToActivate: mongoose.Types.ObjectId | null = null;
  let userRecord = null;
  let academyId = "";

  if (payload.role === "COACH") {
    const coachQuery: Record<string, unknown> = { coachCode: payload.athlixId };
    if (payload.academyId) {
      coachQuery.academyId = new mongoose.Types.ObjectId(payload.academyId);
    }
    const coach = await Coach.findOne(coachQuery);
    if (!coach) throw new NotFoundError("Coach record not found");

    userIdToActivate = coach.userId;
    coach.accountStatus = "ACTIVE";
    coach.activatedAt = new Date();
    await coach.save();

    userRecord = await User.findById(userIdToActivate);
    academyId = coach.academyId.toString();
  } else {
    // Player
    const playerQuery: Record<string, unknown> = { playerCode: payload.athlixId };
    if (payload.academyId) {
      playerQuery.academyId = new mongoose.Types.ObjectId(payload.academyId);
    }
    const player = await Player.findOne(playerQuery);
    if (!player) throw new NotFoundError("Athlete record not found");

    player.accountStatus = "ACTIVE";
    player.activatedAt = new Date();
    await player.save();

    if (player.userId) {
      userIdToActivate = player.userId;
      userRecord = await User.findById(userIdToActivate);
    } else {
      // Create user if not created previously
      userIdToActivate = new mongoose.Types.ObjectId();
      userRecord = await User.create({
        _id: userIdToActivate,
        academyId: player.academyId,
        role: "PLAYER",
        name: player.name,
        email: payload.email.toLowerCase().trim(),
        playerId: player._id,
        status: "ACTIVE",
        passwordHash: hashedPassword,
      });
      player.userId = userIdToActivate;
      await player.save();
    }
    academyId = player.academyId.toString();
  }

  if (!userRecord) {
    throw new NotFoundError("User record not found to activate.");
  }

  userRecord.passwordHash = hashedPassword;
  userRecord.status = "ACTIVE";
  userRecord.metadata = {
    ...userRecord.metadata,
    lastLoginAt: new Date(),
  };
  await userRecord.save();

  // Mark challenge as consumed
  challenge.consumedAt = new Date();
  await challenge.save();

  // Audit log
  try {
    await AuditLog.create({
      academyId: new mongoose.Types.ObjectId(academyId),
      actorId: userRecord._id,
      action: "ACCOUNT_ACTIVATED",
      resourceType: payload.role,
      resourceId: payload.athlixId,
      details: { email: userRecord.email, role: userRecord.role },
      ipAddress: params.ipAddress || "",
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }

  // Create authenticated session
  const sessionToken = await signSessionToken({
    userId: userRecord._id.toString(),
    email: userRecord.email,
    name: userRecord.name,
    role: userRecord.role,
    academyId: userRecord.academyId?.toString(),
    coachId: userRecord.coachId?.toString(),
    playerId: userRecord.playerId?.toString(),
  });

  const redirectUrl =
    userRecord.role === "COACH"
      ? "/coach"
      : userRecord.role === "PLAYER"
      ? "/player"
      : userRecord.role === "ACADEMY_OWNER"
      ? "/owner"
      : userRecord.role === "SCOUT"
      ? "/scout"
      : "/admin";

  return {
    success: true,
    sessionToken,
    user: {
      id: userRecord._id.toString(),
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    },
    redirectUrl,
  };
}
