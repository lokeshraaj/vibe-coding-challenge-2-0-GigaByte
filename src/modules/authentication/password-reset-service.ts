import crypto from "crypto";
import mongoose from "mongoose";
import { SignJWT, jwtVerify } from "jose";
import { User, Coach, Scout, Player, Academy, PasswordResetChallenge, AuditLog } from "@/models";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { sendPasswordResetOtpEmail } from "@/lib/email/brevo";
import { hashPassword } from "@/lib/auth/password";
import { UnauthorizedError, ValidationError, NotFoundError } from "@/lib/errors";

const RESET_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "athlix-password-reset-secret-2026-key"
);

export interface PasswordResetTokenPayload {
  userId: string;
  challengeId: string;
  email: string;
}

export async function signResetToken(payload: PasswordResetTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(RESET_SECRET);
}

export async function verifyResetToken(token: string): Promise<PasswordResetTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, RESET_SECRET);
    return payload as unknown as PasswordResetTokenPayload;
  } catch {
    throw new UnauthorizedError("Password reset session has expired or is invalid. Please restart the reset process.");
  }
}

/**
 * Step 1: Initiate Password Reset
 * Always returns a generic response to prevent account enumeration.
 */
export async function initiatePasswordReset(params: {
  academyCode?: string;
  identifier: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  message: string;
  challengeId: string;
  maskedEmail: string;
}> {
  const rawIdentifier = params.identifier.trim();
  const rawAcademyCode = params.academyCode ? params.academyCode.trim().toUpperCase() : undefined;

  let resolvedUser: any = null;
  let resolvedAcademy: any = null;

  if (rawAcademyCode) {
    resolvedAcademy = await Academy.findOne({ academyCode: rawAcademyCode });
  }

  if (rawIdentifier.includes("@")) {
    // Look up by email
    const emailCandidate = rawIdentifier.toLowerCase();
    const user = await User.findOne({ email: emailCandidate });
    if (user) {
      if (resolvedAcademy) {
        if (user.academyId && user.academyId.toString() === resolvedAcademy._id.toString()) {
          resolvedUser = user;
        }
      } else {
        resolvedUser = user;
      }
    }
  } else {
    // Individual ID (COCR001, PLCR001, SCCR001)
    const cleanId = rawIdentifier.toUpperCase();

    if (resolvedAcademy) {
      // 1. Coach
      const coach = await Coach.findOne({
        academyId: resolvedAcademy._id,
        coachCode: cleanId,
      });
      if (coach && coach.userId) {
        resolvedUser = await User.findOne({ _id: coach.userId, academyId: resolvedAcademy._id });
      } else {
        // 2. Player
        const player = await Player.findOne({
          academyId: resolvedAcademy._id,
          playerCode: cleanId,
        });
        if (player && player.userId) {
          resolvedUser = await User.findOne({ _id: player.userId, academyId: resolvedAcademy._id });
        } else {
          // 3. Scout
          const scout = await Scout.findOne({
            academyId: resolvedAcademy._id,
            scoutCode: cleanId,
          });
          if (scout && scout.userId) {
            resolvedUser = await User.findOne({ _id: scout.userId, academyId: resolvedAcademy._id });
          }
        }
      }
    } else {
      // Look up globally if unique
      const coach = await Coach.findOne({ coachCode: cleanId });
      if (coach && coach.userId) {
        resolvedUser = await User.findById(coach.userId);
      } else {
        const player = await Player.findOne({ playerCode: cleanId });
        if (player && player.userId) {
          resolvedUser = await User.findById(player.userId);
        } else {
          const scout = await Scout.findOne({ scoutCode: cleanId });
          if (scout && scout.userId) {
            resolvedUser = await User.findById(scout.userId);
          }
        }
      }
    }
  }

  // Generic response message to prevent account enumeration
  const genericMessage =
    "If an account matches those credentials, a password reset code has been sent to the registered email address.";

  // If user not found, or blocked/deactivated, return dummy challengeId without sending email
  if (!resolvedUser || resolvedUser.status === "BLOCKED" || resolvedUser.status === "DEACTIVATED") {
    const dummyChallengeId = crypto.randomUUID();
    return {
      success: true,
      message: genericMessage,
      challengeId: dummyChallengeId,
      maskedEmail: maskEmail(rawIdentifier.includes("@") ? rawIdentifier : "user@example.com"),
    };
  }

  // User found! Invalidate previous open challenges
  await PasswordResetChallenge.updateMany(
    { userId: resolvedUser._id, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const otp = generateSecureOtp();
  const otpHash = hashOtp(otp);
  const challengeId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await PasswordResetChallenge.create({
    challengeId,
    identifier: rawIdentifier.toUpperCase(),
    email: resolvedUser.email,
    userId: resolvedUser._id,
    academyId: resolvedUser.academyId,
    academyCode: rawAcademyCode || (resolvedAcademy ? resolvedAcademy.academyCode : undefined),
    otpHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
    consumedAt: null,
    ipAddress: params.ipAddress || "",
  });

  // Dispatch Brevo OTP email
  await sendPasswordResetOtpEmail({
    toEmail: resolvedUser.email,
    recipientName: resolvedUser.name || "User",
    otpCode: otp,
    identifier: rawIdentifier.toUpperCase(),
    academyCode: rawAcademyCode || (resolvedAcademy ? resolvedAcademy.academyCode : undefined),
  });

  return {
    success: true,
    message: genericMessage,
    challengeId,
    maskedEmail: maskEmail(resolvedUser.email),
  };
}

/**
 * Step 2: Verify Password Reset OTP
 */
export async function verifyPasswordResetOtp(params: {
  challengeId: string;
  otp: string;
}): Promise<{
  success: boolean;
  resetToken: string;
}> {
  const challenge = await PasswordResetChallenge.findOne({ challengeId: params.challengeId });

  if (!challenge) {
    throw new UnauthorizedError("Invalid or expired password reset challenge.");
  }

  if (challenge.consumedAt) {
    throw new UnauthorizedError("This password reset verification code has already been used.");
  }

  if (new Date() > challenge.expiresAt) {
    throw new UnauthorizedError("The verification code has expired (5-minute limit). Please request a new code.");
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new UnauthorizedError("Maximum verification attempts exceeded. Please request a new password reset code.");
  }

  // Increment attempts
  challenge.attempts += 1;

  const isValidOtp = verifyOtp(params.otp, challenge.otpHash);
  if (!isValidOtp) {
    await challenge.save();
    throw new UnauthorizedError("Invalid verification code. Please check your email and try again.");
  }

  // Generate Reset Token valid for 10 minutes
  const resetToken = await signResetToken({
    userId: challenge.userId.toString(),
    challengeId: challenge.challengeId,
    email: challenge.email,
  });

  // Save token hash or updated status
  challenge.resetTokenHash = hashOtp(resetToken);
  await challenge.save();

  return {
    success: true,
    resetToken,
  };
}

/**
 * Step 3: Complete Password Reset
 */
export async function completePasswordReset(params: {
  resetToken: string;
  password: string;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const payload = await verifyResetToken(params.resetToken);

  const challenge = await PasswordResetChallenge.findOne({ challengeId: payload.challengeId });
  if (!challenge || challenge.consumedAt) {
    throw new UnauthorizedError("This password reset session has already been used or is invalid.");
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new NotFoundError("Associated user account not found.");
  }

  // Hash new password (12 bcrypt rounds)
  const passwordHash = await hashPassword(params.password);
  user.passwordHash = passwordHash;

  if (user.status === "PENDING" || user.status === "INVITED") {
    user.status = "ACTIVE";
  }

  await user.save();

  // Mark challenge consumed
  challenge.consumedAt = new Date();
  await challenge.save();

  // Audit log
  try {
    await AuditLog.create({
      academyId: user.academyId || null,
      actorId: user._id,
      actorRole: user.role,
      action: "PASSWORD_RESET",
      resourceType: "USER",
      resourceId: user._id.toString(),
      reason: "Self-service password reset via OTP",
      status: "SUCCESS",
      ipAddress: params.ipAddress || "",
    });
  } catch (err) {
    console.error("Failed to write audit log for password reset:", err);
  }

  return {
    success: true,
    message: "Your password has been successfully reset. You can now sign in with your new password.",
  };
}
