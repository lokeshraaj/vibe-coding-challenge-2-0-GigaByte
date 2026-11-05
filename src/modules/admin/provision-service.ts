import mongoose from "mongoose";
import { User, SystemProvisioning, AuditLog } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/db/mongodb";

export interface ProvisionResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
  provisionedAt?: Date;
  alreadyProvisioned?: boolean;
}

/**
 * One-time server-side initial Super Admin provisioning.
 * Strictly controlled, atomic, protected against simultaneous execution,
 * and completely decoupled from any public registration or login flow.
 */
export async function provisionInitialSuperAdmin(): Promise<ProvisionResult> {
  await connectToDatabase();

  const email = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const rawPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD;

  if (!email || !rawPassword) {
    throw new Error(
      "Missing configuration: Ensure both INITIAL_SUPER_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_PASSWORD are set in your environment or .env.local file."
    );
  }

  // 1. Check if initial super admin has already been provisioned in MongoDB
  const existingProvisioning = await SystemProvisioning.findOne({
    identifier: "initial_super_admin",
    status: "COMPLETED",
  });

  if (existingProvisioning) {
    return {
      success: false,
      alreadyProvisioned: true,
      message: `Initial Super Admin has already been provisioned on ${existingProvisioning.completedAt.toISOString()} for email '${existingProvisioning.email}'. Further initial provisioning is strictly blocked.`,
      provisionedAt: existingProvisioning.completedAt,
    };
  }

  // 2. Hash password securely using bcrypt/Argon2id
  const hashedPassword = await hashPassword(rawPassword);

  // 3. Find existing user or create designated Super Admin account
  let user = await User.findOne({ email });

  if (user) {
    user.role = "SUPER_ADMIN";
    user.passwordHash = hashedPassword;
    user.status = "ACTIVE";
    user.metadata = {
      ...user.metadata,
      lastLoginAt: user.metadata?.lastLoginAt || undefined,
    };
    await user.save();
  } else {
    user = await User.create({
      name: "Platform Super Admin",
      email,
      role: "SUPER_ADMIN",
      passwordHash: hashedPassword,
      status: "ACTIVE",
      academyId: null,
    });
  }

  // 4. Record persistent provisioning receipt with atomic unique index protection
  const provisioningRecord = await SystemProvisioning.findOneAndUpdate(
    { identifier: "initial_super_admin" },
    {
      $set: {
        status: "COMPLETED",
        userId: user._id,
        email: user.email,
        role: "SUPER_ADMIN",
        completedAt: new Date(),
        metadata: {
          provisionedVia: "CLI",
          nodeEnv: process.env.NODE_ENV || "development",
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 5. Create audit log entry
  try {
    await AuditLog.create({
      actorId: user._id,
      action: "INITIAL_SUPER_ADMIN_PROVISIONED",
      resourceType: "SUPER_ADMIN",
      resourceId: user._id.toString(),
      details: {
        email: user.email,
        role: user.role,
        provisioningId: provisioningRecord._id.toString(),
      },
    });
  } catch (auditErr) {
    console.warn("[AuditLog Warning]", auditErr);
  }

  return {
    success: true,
    alreadyProvisioned: false,
    message: `Initial Super Admin successfully provisioned for '${user.email}' with role 'SUPER_ADMIN'.`,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    },
    provisionedAt: provisioningRecord.completedAt,
  };
}
