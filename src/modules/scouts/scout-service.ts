import mongoose from "mongoose";
import { Scout, Coach, User } from "@/models";
import { hashPassword } from "@/lib/auth/password";
import { generateAthlixId } from "@/lib/id-generator";
import { ConflictError, NotFoundError } from "@/lib/errors";

export interface CreateScoutInput {
  academyId: string;
  name: string;
  email: string;
  assignedCoachId: string;
  organization?: string;
  experienceYears?: number;
  password?: string;
}

export async function createScout(input: CreateScoutInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError("A user with this email already exists.");
  }

  const coach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(input.assignedCoachId),
    academyId: new mongoose.Types.ObjectId(input.academyId),
  });

  if (!coach) {
    throw new NotFoundError("Assigned coach does not exist in this academy.");
  }

  // Generate atomic, collision-free Scout ID (e.g. SCFO001)
  const scoutCode = await generateAthlixId({
    academyId: input.academyId,
    userType: "SCOUT",
    sport: coach.sport,
  });

  const defaultPassword = input.password || "ScoutAthlix2026!";
  const hashedPassword = await hashPassword(defaultPassword);

  const userId = new mongoose.Types.ObjectId();
  const scoutId = new mongoose.Types.ObjectId();

  const user = await User.create({
    _id: userId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    role: "SCOUT",
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: hashedPassword,
    coachId: coach._id, // References assigned coach
    status: "ACTIVE",
  });

  const scout = await Scout.create({
    _id: scoutId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    userId: userId,
    assignedCoachId: coach._id,
    scoutCode: scoutCode,
    organization: input.organization || "",
    experienceYears: input.experienceYears || 0,
    status: "ACTIVE",
  });

  // Update coach's primary scout
  coach.assignedScoutId = scout._id as mongoose.Types.ObjectId;
  await coach.save();

  return {
    id: scout._id.toString(),
    userId: user._id.toString(),
    scoutCode: scout.scoutCode,
    name: user.name,
    email: user.email,
    assignedCoachId: coach._id.toString(),
    organization: scout.organization,
    experienceYears: scout.experienceYears,
  };
}

export async function reassignScout(
  academyId: string,
  scoutId: string,
  newCoachId: string
) {
  const scout = await Scout.findOne({
    _id: new mongoose.Types.ObjectId(scoutId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!scout) {
    throw new NotFoundError("Scout not found");
  }

  const newCoach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(newCoachId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!newCoach) {
    throw new NotFoundError("Target coach not found in this academy");
  }

  // Remove scout from previous coach if assigned
  if (scout.assignedCoachId) {
    await Coach.updateOne(
      { _id: scout.assignedCoachId },
      { $unset: { assignedScoutId: 1 } }
    );
  }

  // Update scout record
  scout.assignedCoachId = newCoach._id as mongoose.Types.ObjectId;
  await scout.save();

  // Update new coach's assigned scout
  newCoach.assignedScoutId = scout._id as mongoose.Types.ObjectId;
  await newCoach.save();

  // Update scout's user record coachId context
  await User.updateOne({ _id: scout.userId }, { coachId: newCoach._id });

  return {
    success: true,
    scoutId: scout._id.toString(),
    assignedCoachId: newCoach._id.toString(),
  };
}

export async function listScoutsByAcademy(academyId: string) {
  const scouts = await Scout.find({ academyId: new mongoose.Types.ObjectId(academyId) })
    .populate("userId", "name email status")
    .populate("assignedCoachId")
    .lean();

  return Promise.all(
    scouts.map(async (s) => {
      let coachName = "Unassigned";
      let coachSport = "";
      if (s.assignedCoachId) {
        const coachDoc = await Coach.findById(s.assignedCoachId).populate("userId", "name");
        if (coachDoc && coachDoc.userId) {
          coachName = (coachDoc.userId as unknown as { name: string }).name;
          coachSport = coachDoc.sport;
        }
      }

      const u = s.userId as unknown as { name: string; email: string; status: string };

      return {
        id: s._id.toString(),
        userId: s.userId?.toString(),
        scoutCode: s.scoutCode || "",
        name: u?.name || "Unknown",
        email: u?.email || "",
        organization: s.organization,
        experienceYears: s.experienceYears,
        status: s.status,
        assignedCoachId: s.assignedCoachId?._id ? s.assignedCoachId._id.toString() : s.assignedCoachId?.toString(),
        coachName,
        coachSport,
      };
    })
  );
}
