import mongoose from "mongoose";
import crypto from "node:crypto";
import { Academy, User, PendingAcademyRegistration } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/utils";
import { generateAcademyCode } from "@/lib/id-generator";
import { sendAcademyRegistrationEmail, sendAcademyOtpEmail } from "@/lib/email/brevo";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { ConflictError, NotFoundError, ValidationError, UnauthorizedError, BadRequestError } from "@/lib/errors";
import { validateAndNormalizePhone } from "@/lib/validation/phone";

export interface RegisterAcademyInput {
  academyName: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  address?: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

/**
 * Phase 4 Step 1 & 2: Initiates academy registration with mandatory email OTP verification.
 * - Validates input data.
 * - Does NOT activate the academy yet.
 * - Does NOT issue an Academy Code yet.
 * - Creates a pending registration challenge and sends 6-digit OTP to admin email.
 */
export async function initiateAcademyRegistration(input: RegisterAcademyInput, ipAddress?: string) {
  const normalizedOwnerEmail = input.ownerEmail.trim().toLowerCase();
  const normalizedContactEmail = input.contactEmail.trim().toLowerCase();

  // Validate and normalize contact phone to E.164
  const phoneCheck = validateAndNormalizePhone(input.contactPhone);
  if (!phoneCheck.isValid) {
    throw new BadRequestError(phoneCheck.error || "Valid contact phone number is required.");
  }
  const normalizedContactPhone = phoneCheck.e164 || input.contactPhone.trim();

  // 1. Check if owner email is already taken by an active or existing user
  const existingUser = await User.findOne({ email: normalizedOwnerEmail });
  if (existingUser) {
    throw new ConflictError("An account with this owner email address already exists.");
  }

  // 2. Generate secure 6-digit OTP and store SHA-256 hash
  const otpCode = generateSecureOtp();
  const otpHash = hashOtp(otpCode);
  const challengeId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);

  // Invalidate any existing pending registration for this owner email
  await PendingAcademyRegistration.deleteMany({
    "registrationData.ownerEmail": normalizedOwnerEmail,
  });

  // Store pending registration with 5-minute expiry
  await PendingAcademyRegistration.create({
    challengeId,
    registrationData: {
      academyName: input.academyName.trim(),
      description: input.description?.trim() || "",
      city: input.city.trim(),
      state: input.state.trim(),
      country: input.country.trim(),
      address: input.address?.trim() || "",
      contactEmail: normalizedContactEmail,
      contactPhone: normalizedContactPhone,
      ownerName: input.ownerName.trim(),
      ownerEmail: normalizedOwnerEmail,
      passwordHash,
    },
    otpHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    ipAddress: ipAddress || "",
  });

  // Dispatch OTP email via Brevo
  try {
    await sendAcademyOtpEmail({
      toEmail: normalizedOwnerEmail,
      ownerName: input.ownerName.trim(),
      academyName: input.academyName.trim(),
      otpCode,
    });
  } catch (emailErr) {
    console.error("[Brevo Academy OTP Warning] OTP email delivery failed:", emailErr);
  }

  return {
    challengeId,
    ownerEmail: normalizedOwnerEmail,
    maskedEmail: maskEmail(normalizedOwnerEmail),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

/**
 * Phase 4 Step 3 & 4: Verifies the email OTP, generates the Academy Code, and completes tenant provisioning.
 */
export async function verifyAcademyRegistrationOtp(params: {
  challengeId: string;
  otp: string;
  ipAddress?: string;
}) {
  const pending = await PendingAcademyRegistration.findOne({
    challengeId: params.challengeId,
  });

  if (!pending) {
    throw new NotFoundError("Registration session not found or expired. Please submit the form again.");
  }

  if (pending.consumedAt) {
    throw new ConflictError("This registration has already been verified and completed. Please sign in.");
  }

  if (new Date() > pending.expiresAt) {
    throw new ValidationError("Verification code has expired. Please request a new code.");
  }

  if (pending.attempts >= pending.maxAttempts) {
    throw new UnauthorizedError("Maximum verification attempts exceeded. Please restart registration.");
  }

  const isValid = verifyOtp(params.otp, pending.otpHash);
  if (!isValid) {
    pending.attempts += 1;
    await pending.save();
    const remaining = pending.maxAttempts - pending.attempts;
    throw new ValidationError(`Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // Mark challenge consumed
  pending.consumedAt = new Date();
  await pending.save();

  const regData = pending.registrationData;

  // Final check for owner email collision before creation
  const existingUser = await User.findOne({ email: regData.ownerEmail });
  if (existingUser) {
    throw new ConflictError("An account with this owner email address already exists.");
  }

  // Generate unique slug
  let slug = slugify(regData.academyName);
  const existingAcademySlug = await Academy.findOne({ slug });
  if (existingAcademySlug) {
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  // Generate atomic, sequential Academy Code (SSNNNN based on state) ONLY after successful OTP verification!
  const academyCode = await generateAcademyCode(regData.state);

  const ownerUserId = new mongoose.Types.ObjectId();
  const academyId = new mongoose.Types.ObjectId();

  // Create owner user
  const ownerUser = await User.create({
    _id: ownerUserId,
    academyId: academyId,
    role: "ACADEMY_OWNER",
    name: regData.ownerName,
    email: regData.ownerEmail,
    passwordHash: regData.passwordHash,
    status: "ACTIVE",
    metadata: {
      phone: regData.contactPhone,
      emailVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Create academy document with permanent Academy Code
  const academy = await Academy.create({
    _id: academyId,
    name: regData.academyName,
    slug,
    academyCode,
    state: regData.state,
    description: regData.description || "",
    location: {
      address: regData.address || "",
      city: regData.city,
      state: regData.state,
      country: regData.country,
    },
    contactEmail: regData.contactEmail,
    contactPhone: regData.contactPhone,
    ownerId: ownerUserId,
    status: "ACTIVE",
  });

  // Phase 4 Step 5: Send confirmation email with official Academy Code
  try {
    await sendAcademyRegistrationEmail({
      toEmail: regData.ownerEmail,
      ownerName: ownerUser.name,
      academyName: academy.name,
      academyCode: academy.academyCode!,
      city: academy.location.city,
      state: academy.location.state,
    });
  } catch (emailErr) {
    console.error("[Brevo Academy Registration Warning] Welcome email delivery failed, academy preserved:", emailErr);
  }

  return {
    academy: {
      id: academy._id.toString(),
      name: academy.name,
      slug: academy.slug,
      academyCode: academy.academyCode,
      status: academy.status,
    },
    owner: {
      id: ownerUser._id.toString(),
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role,
    },
  };
}

/**
 * Resends the 6-digit OTP for pending academy registration with 60-second cooldown.
 */
export async function resendAcademyRegistrationOtp(params: {
  challengeId: string;
  ipAddress?: string;
}) {
  const pending = await PendingAcademyRegistration.findOne({
    challengeId: params.challengeId,
  });

  if (!pending) {
    throw new NotFoundError("Registration session not found. Please restart registration.");
  }

  if (pending.consumedAt) {
    throw new ConflictError("This registration has already been completed.");
  }

  // 60-second cooldown check based on updatedAt
  const timeSinceLastUpdate = Date.now() - new Date(pending.updatedAt).getTime();
  if (timeSinceLastUpdate < 60 * 1000) {
    const remainingSec = Math.ceil((60 * 1000 - timeSinceLastUpdate) / 1000);
    throw new ValidationError(`Please wait ${remainingSec} seconds before requesting a new code.`);
  }

  const newOtp = generateSecureOtp();
  pending.otpHash = hashOtp(newOtp);
  pending.attempts = 0;
  pending.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await pending.save();

  try {
    await sendAcademyOtpEmail({
      toEmail: pending.registrationData.ownerEmail,
      ownerName: pending.registrationData.ownerName,
      academyName: pending.registrationData.academyName,
      otpCode: newOtp,
    });
  } catch (emailErr) {
    console.error("[Brevo Academy OTP Warning] Resend OTP email delivery failed:", emailErr);
  }

  return {
    success: true,
    maskedEmail: maskEmail(pending.registrationData.ownerEmail),
    expiresAt: pending.expiresAt.toISOString(),
  };
}

/**
 * Direct registration (preserved for legacy calls, seeds, and automated tests).
 */
export async function registerAcademy(input: RegisterAcademyInput) {
  const normalizedOwnerEmail = input.ownerEmail.trim().toLowerCase();
  const normalizedContactEmail = input.contactEmail.trim().toLowerCase();

  const phoneCheck = validateAndNormalizePhone(input.contactPhone);
  if (!phoneCheck.isValid) {
    throw new BadRequestError(phoneCheck.error || "Valid contact phone number is required.");
  }
  const normalizedContactPhone = phoneCheck.e164 || input.contactPhone.trim();

  const existingUser = await User.findOne({ email: normalizedOwnerEmail });
  if (existingUser) {
    throw new ConflictError("An account with this owner email address already exists.");
  }

  let slug = slugify(input.academyName);
  const existingAcademySlug = await Academy.findOne({ slug });
  if (existingAcademySlug) {
    slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const academyCode = await generateAcademyCode(input.state);
  const hashedPassword = await hashPassword(input.password);

  const ownerUserId = new mongoose.Types.ObjectId();
  const academyId = new mongoose.Types.ObjectId();

  const ownerUser = await User.create({
    _id: ownerUserId,
    academyId: academyId,
    role: "ACADEMY_OWNER",
    name: input.ownerName.trim(),
    email: normalizedOwnerEmail,
    passwordHash: hashedPassword,
    status: "ACTIVE",
    metadata: {
      phone: normalizedContactPhone,
    },
  });

  const academy = await Academy.create({
    _id: academyId,
    name: input.academyName.trim(),
    slug,
    academyCode,
    state: input.state.trim(),
    description: input.description || "",
    location: {
      address: input.address || "",
      city: input.city.trim(),
      state: input.state.trim(),
      country: input.country.trim(),
    },
    contactEmail: normalizedContactEmail,
    contactPhone: normalizedContactPhone,
    ownerId: ownerUserId,
    status: "ACTIVE",
  });

  try {
    await sendAcademyRegistrationEmail({
      toEmail: normalizedOwnerEmail,
      ownerName: ownerUser.name,
      academyName: academy.name,
      academyCode: academy.academyCode!,
      city: academy.location.city,
      state: academy.location.state,
    });
  } catch (emailErr) {
    console.error("[Brevo Academy Registration Warning] Welcome email delivery failed, academy preserved:", emailErr);
  }

  return {
    academy: {
      id: academy._id.toString(),
      name: academy.name,
      slug: academy.slug,
      academyCode: academy.academyCode,
      status: academy.status,
    },
    owner: {
      id: ownerUser._id.toString(),
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role,
    },
  };
}

export async function getAcademyById(academyId: string) {
  const academy = await Academy.findById(academyId).populate("ownerId", "name email");
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }
  return academy;
}

export async function getAcademyByCode(academyCode: string) {
  if (!academyCode) {
    throw new ValidationError("Academy Code is required");
  }
  const cleanCode = academyCode.trim().toUpperCase();
  const academy = await Academy.findOne({ academyCode: cleanCode });
  if (!academy) {
    throw new NotFoundError("Invalid Academy Code. Please check the code provided by your academy.");
  }
  return academy;
}
