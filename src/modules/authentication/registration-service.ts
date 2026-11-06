import mongoose from "mongoose";
import { SignJWT, jwtVerify } from "jose";
import { Coach, Player, Scout, User, OtpChallenge, AuditLog, Academy } from "@/models";
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
  role: "COACH" | "PLAYER" | "SCOUT";
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
  role: "COACH" | "PLAYER" | "SCOUT";
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
  } else if (params.role === "SCOUT") {
    const query: Record<string, unknown> = { scoutCode: cleanId };
    if (resolvedAcademyId) {
      query.academyId = resolvedAcademyId;
    }

    const scout = await Scout.findOne(query).populate("userId", "name email status");
    if (!scout) {
      throw new NotFoundError(
        resolvedAcademyId
          ? "Invalid Scout ID for this academy. Please check the ID provided by your academy administrator."
          : "Invalid Scout ID. Please check the ID provided by your academy."
      );
    }

    if (!resolvedAcademyId && scout.academyId) {
      resolvedAcademyId = scout.academyId;
      academy = await Academy.findById(resolvedAcademyId);
    }

    if (scout.accountStatus === "ACTIVE") {
      throw new ConflictError("This scout account has already been activated. Please proceed to the login page.");
    }

    const u = scout.userId as unknown as { name: string; email: string; status: string };
    if (!u || !u.email) {
      throw new NotFoundError("No user record found for this scout.");
    }

    if (u.status === "ACTIVE") {
      throw new ConflictError("This scout account has already been activated. Please proceed to the login page.");
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

  // Generate 6-digit OTP
  const otpCode = generateSecureOtp();
  const otpHash = hashOtp(otpCode);

  // Invalidate previous challenges
  await OtpChallenge.updateMany(
    { identifier: cleanId, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  // Save new challenge (5-minute expiry)
  const challenge = await OtpChallenge.create({
    identifier: cleanId,
    email: recipientEmail.toLowerCase().trim(),
    role: params.role,
    otpHash: otpHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ipAddress: params.ipAddress || "",
  });

  // Dispatch OTP email via Brevo
  const emailResult = await sendOtpEmail({
    toEmail: recipientEmail,
    recipientName: recipientName,
    otpCode: otpCode,
    role: params.role,
    athlixId: cleanId,
    academyCode: academy?.academyCode,
  });

  if (!emailResult.success) {
    console.error("[OTP Delivery Warning] Failed to dispatch Brevo OTP email:", emailResult.error);
    await OtpChallenge.deleteOne({ _id: challenge._id });
    throw new AppError("We were unable to deliver your verification email. Please verify your address and try again.", 502);
  }

  return {
    success: true,
    maskedEmail: maskEmail(recipientEmail),
    expiresAt: challenge.expiresAt,
    challengeId: challenge._id.toString(),
    academyCode: academy?.academyCode || "",
    academyName: academy?.name || "",
  };
}

/**
 * Step 3 & 4: Cryptographically verify the OTP code.
 */
export async function verifyRegistrationOtp(params: {
  athlixId: string;
  otp: string;
  academyCode?: string;
  ipAddress?: string;
}) {
  const cleanId = params.athlixId.trim().toUpperCase();

  const challenge = await OtpChallenge.findOne({
    identifier: cleanId,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!challenge) {
    throw new NotFoundError("No active verification code found for this ID. Please request a new code.");
  }

  // Expiration check
  if (new Date() > challenge.expiresAt) {
    throw new UnauthorizedError("Verification code has expired. Please request a fresh code.");
  }

  // Maximum attempts check (5 attempts)
  if (challenge.attempts >= challenge.maxAttempts) {
    throw new UnauthorizedError("Maximum verification attempts exceeded. Please request a new code.");
  }

  // Constant-time OTP comparison
  const isValid = verifyOtp(params.otp, challenge.otpHash);
  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    const remaining = challenge.maxAttempts - challenge.attempts;
    throw new UnauthorizedError(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  let academyId: string | undefined = undefined;
  let academyCode: string | undefined = params.academyCode;

  if (params.academyCode) {
    const academy = await Academy.findOne({ academyCode: params.academyCode.trim().toUpperCase() });
    if (academy) {
      academyId = academy._id.toString();
      academyCode = academy.academyCode;
    }
  }

  if (!academyId) {
    if (challenge.role === "COACH") {
      const c = await Coach.findOne({ coachCode: cleanId });
      if (c) academyId = c.academyId.toString();
    } else if (challenge.role === "SCOUT") {
      const s = await Scout.findOne({ scoutCode: cleanId });
      if (s) academyId = s.academyId.toString();
    } else {
      const p = await Player.findOne({ playerCode: cleanId });
      if (p) academyId = p.academyId.toString();
    }
  }

  // Issue 10-minute single-use activation JWT token
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
    role: challenge.role,
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
  } else if (payload.role === "SCOUT") {
    const scoutQuery: Record<string, unknown> = { scoutCode: payload.athlixId };
    if (payload.academyId) {
      scoutQuery.academyId = new mongoose.Types.ObjectId(payload.academyId);
    }
    const scout = await Scout.findOne(scoutQuery);
    if (!scout) throw new NotFoundError("Scout record not found");

    userIdToActivate = scout.userId;
    scout.accountStatus = "ACTIVE";
    scout.activatedAt = new Date();
    await scout.save();

    userRecord = await User.findById(userIdToActivate);
    academyId = scout.academyId.toString();
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

  // Issue authenticated session token
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
      : userRecord.role === "SCOUT"
      ? "/scout"
      : "/player";

  return {
    success: true,
    sessionToken,
    redirectUrl,
    user: {
      id: userRecord._id.toString(),
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
    },
  };
}
