import mongoose from "mongoose";
import { Coach, User, Scout, Player } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateCoachInput {
  academyId: string;
  name: string;
  email: string;
  sport: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  password?: string;
}

export async function createCoach(input: CreateCoachInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError("A user with this email already exists.");
  }

  const defaultPassword = input.password || "CoachAthlix2026!";
  const hashedPassword = await hashPassword(defaultPassword);

  const userId = new mongoose.Types.ObjectId();
  const coachId = new mongoose.Types.ObjectId();

  const user = await User.create({
    _id: userId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    role: "COACH",
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: hashedPassword,
    coachId: coachId,
    status: "ACTIVE",
  });

  const coach = await Coach.create({
    _id: coachId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    userId: userId,
    sport: input.sport.trim(),
    specialization: input.specialization || "",
    experienceYears: input.experienceYears || 0,
    bio: input.bio || "",
    status: "ACTIVE",
  });

  return {
    id: coach._id.toString(),
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    sport: coach.sport,
    specialization: coach.specialization,
    experienceYears: coach.experienceYears,
    status: coach.status,
  };
}

export async function listCoachesByAcademy(academyId: string) {
  const coaches = await Coach.find({ academyId: new mongoose.Types.ObjectId(academyId) })
    .populate("userId", "name email status metadata")
    .populate("assignedScoutId")
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

      const u = c.userId as unknown as { name: string; email: string; status: string };

      return {
        id: c._id.toString(),
        userId: u ? c.userId.toString() : "",
        name: u?.name || "Unknown",
        email: u?.email || "",
        sport: c.sport,
        specialization: c.specialization,
        experienceYears: c.experienceYears,
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
