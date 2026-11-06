import mongoose from "mongoose";
import { Coach, User, Scout, Player, Academy, AuditLog } from "@/models";
import { generateAthlixId } from "@/lib/id-generator";
import { sendCoachNotificationEmail } from "@/lib/email/brevo";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateCoachInput {
  academyId: string;
  name: string;
  email: string;
  phone?: string;
  sport: string;
  assignedSports?: string[];
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  password?: string;
}

export async function createCoach(input: CreateCoachInput, actorId?: string) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError("A user with this email already exists.");
  }

  const academy = await Academy.findById(new mongoose.Types.ObjectId(input.academyId));
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  // Generate atomic, collision-free Coach ID (e.g. COFO001)
  const coachCode = await generateAthlixId({
    academyId: input.academyId,
    userType: "COACH",
    sport: input.sport,
  });

  const userId = new mongoose.Types.ObjectId();
  const coachId = new mongoose.Types.ObjectId();

  // Create pending user account (must activate via ID + OTP before setting password)
  const user = await User.create({
    _id: userId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    role: "COACH",
    name: input.name.trim(),
    email: normalizedEmail,
    coachId: coachId,
    status: "PENDING",
    metadata: {
      phone: input.phone?.trim() || "",
    },
  });

  const coach = await Coach.create({
    _id: coachId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    userId: userId,
    coachCode: coachCode,
    phone: input.phone?.trim() || "",
    sport: input.sport.trim(),
    assignedSports: input.assignedSports && input.assignedSports.length > 0 ? input.assignedSports : [input.sport.trim()],
    specialization: input.specialization || "",
    experienceYears: input.experienceYears || 0,
    bio: input.bio || "",
    accountStatus: "PENDING",
    status: "ACTIVE",
  });

  // Record audit log
  try {
    if (actorId) {
      await AuditLog.create({
        academyId: new mongoose.Types.ObjectId(input.academyId),
        actorId: new mongoose.Types.ObjectId(actorId),
        action: "COACH_INVITED",
        resourceType: "COACH",
        resourceId: coachCode,
        details: { name: user.name, email: user.email, sport: coach.sport },
      });
    }
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }

  // Send informational notification email through Brevo (without blocking DB transaction)
  try {
    await sendCoachNotificationEmail({
      toEmail: normalizedEmail,
      coachName: user.name,
      coachId: coachCode,
      academyName: academy.name,
      academyCode: academy.academyCode || "",
      sport: coach.sport,
    });
  } catch (emailErr) {
    console.error("[Brevo Notification Warning] Email delivery failed, ID preserved:", emailErr);
  }

  return {
    id: coach._id.toString(),
    userId: user._id.toString(),
    coachCode: coach.coachCode,
    name: user.name,
    email: user.email,
    phone: coach.phone,
    sport: coach.sport,
    assignedSports: coach.assignedSports,
    specialization: coach.specialization,
    experienceYears: coach.experienceYears,
    accountStatus: coach.accountStatus,
    status: coach.status,
  };
}

export async function resendCoachNotification(academyId: string, coachId: string) {
  const coach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(coachId),
    academyId: new mongoose.Types.ObjectId(academyId),
  }).populate("userId", "name email");

  if (!coach || !coach.coachCode) {
    throw new NotFoundError("Coach record not found");
  }

  const academy = await Academy.findById(new mongoose.Types.ObjectId(academyId));
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  const u = coach.userId as unknown as { name: string; email: string };

  await sendCoachNotificationEmail({
    toEmail: u.email,
    coachName: u.name,
    coachId: coach.coachCode,
    academyName: academy.name,
    academyCode: academy.academyCode || "",
    sport: coach.sport,
  });

  return { success: true, message: `Notification re-sent to ${u.email}` };
}

export async function listCoachesByAcademy(academyId: string) {
  const coaches = await Coach.find({ academyId: new mongoose.Types.ObjectId(academyId) })
    .populate("userId", "name email status metadata")
    .populate("assignedScoutId")
    .sort({ createdAt: -1 })
    .lean();

  // Attach player counts for each coach
  const coachesWithStats = await Promise.all(
    coaches.map(async (c) => {
      const playerCount = await Player.countDocuments({
        academyId: new mongoose.Types.ObjectId(academyId),
        coachId: c._id,
        status: "ACTIVE",
      });

      let scoutInfo = null;
      if (c.assignedScoutId) {
        const scoutDoc = await Scout.findById(c.assignedScoutId).populate("userId", "name email");
        if (scoutDoc && scoutDoc.userId) {
          const u = scoutDoc.userId as unknown as { name: string; email: string };
          scoutInfo = {
            id: scoutDoc._id.toString(),
            name: u.name,
            email: u.email,
            organization: scoutDoc.organization,
          };
        }
      }

      const u = c.userId as unknown as { name: string; email: string; status: string; metadata?: { phone?: string } };

      return {
        id: c._id.toString(),
        userId: u ? c.userId.toString() : "",
        coachCode: c.coachCode || "",
        name: u?.name || "Unknown",
        email: u?.email || "",
        phone: c.phone || u?.metadata?.phone || "",
        sport: c.sport,
        assignedSports: c.assignedSports || [c.sport],
        specialization: c.specialization,
        experienceYears: c.experienceYears,
        accountStatus: c.accountStatus || "ACTIVE",
        status: c.status,
        playerCount,
        assignedScout: scoutInfo,
      };
    })
  );

  return coachesWithStats;
}

export async function getCoachById(academyId: string, coachId: string) {
  const coach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(coachId),
    academyId: new mongoose.Types.ObjectId(academyId),
  })
    .populate("userId", "name email status metadata")
    .populate("assignedScoutId");

  if (!coach) {
    throw new NotFoundError("Coach not found in this academy");
  }

  return coach;
}
