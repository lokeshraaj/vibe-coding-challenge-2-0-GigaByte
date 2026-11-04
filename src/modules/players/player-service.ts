import mongoose from "mongoose";
import { Player, Coach, User } from "@/models";
import { generatePlayerCode, calculateAge } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";
import { ConflictError, NotFoundError, ForbiddenError } from "@/lib/errors";

export interface CreatePlayerInput {
  academyId: string;
  coachId: string;
  name: string;
  dateOfBirth: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  sport: string;
  position: string;
  photoUrl?: string;
  enrollmentDate: string;
  contact?: {
    phone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  createLoginAccount?: boolean;
  accountPassword?: string;
}

export interface PlayerFilterQuery {
  academyId: string;
  coachId?: string;
  sport?: string;
  minAge?: number;
  maxAge?: number;
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}

export async function createPlayer(input: CreatePlayerInput) {
  // Verify coach belongs to the same academy
  const coach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(input.coachId),
    academyId: new mongoose.Types.ObjectId(input.academyId),
  });

  if (!coach) {
    throw new NotFoundError("Assigned coach does not exist in this academy.");
  }

  // Generate unique player code within academy
  let playerCode = generatePlayerCode(input.sport);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await Player.findOne({
      academyId: new mongoose.Types.ObjectId(input.academyId),
      playerCode,
    });
    if (!existing) break;
    playerCode = generatePlayerCode(input.sport);
    attempts++;
  }

  const playerId = new mongoose.Types.ObjectId();
  let userId: mongoose.Types.ObjectId | undefined = undefined;

  // If player requested a login account and provided email
  if (input.createLoginAccount && input.contact?.email) {
    const normalizedEmail = input.contact.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError("A user account with this player email already exists.");
    }

    const rawPassword = input.accountPassword || "PlayerAthlix2026!";
    const hashedPassword = await hashPassword(rawPassword);

    userId = new mongoose.Types.ObjectId();
    await User.create({
      _id: userId,
      academyId: new mongoose.Types.ObjectId(input.academyId),
      role: "PLAYER",
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: hashedPassword,
      playerId: playerId,
      status: "ACTIVE",
    });
  }

  const player = await Player.create({
    _id: playerId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
    userId: userId || null,
    playerCode,
    name: input.name.trim(),
    dateOfBirth: new Date(input.dateOfBirth),
    gender: input.gender || "MALE",
    sport: input.sport.trim(),
    position: input.position.trim(),
    photoUrl: input.photoUrl || "",
    enrollmentDate: new Date(input.enrollmentDate),
    contact: input.contact || {},
    status: "ACTIVE",
  });

  return {
    id: player._id.toString(),
    playerCode: player.playerCode,
    name: player.name,
    sport: player.sport,
    position: player.position,
    age: calculateAge(player.dateOfBirth),
    coachId: player.coachId.toString(),
    status: player.status,
    hasLoginAccount: Boolean(userId),
  };
}

export async function listPlayers(filter: PlayerFilterQuery) {
  const query: Record<string, unknown> = {
    academyId: new mongoose.Types.ObjectId(filter.academyId),
  };

  if (filter.coachId) {
    query.coachId = new mongoose.Types.ObjectId(filter.coachId);
  }

  if (filter.sport && filter.sport !== "ALL") {
    query.sport = new RegExp(`^${filter.sport}$`, "i");
  }

  if (filter.status && filter.status !== "ALL") {
    query.status = filter.status;
  } else {
    query.status = "ACTIVE";
  }

  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { playerCode: { $regex: s, $options: "i" } },
      { position: { $regex: s, $options: "i" } },
    ];
  }

  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const skip = (page - 1) * limit;

  const [players, totalCount] = await Promise.all([
    Player.find(query)
      .populate({
        path: "coachId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Player.countDocuments(query),
  ]);

  const items = players.map((p) => {
    const coachDoc = p.coachId as unknown as {
      _id: mongoose.Types.ObjectId;
      sport: string;
      userId: { name: string; email: string };
    };

    return {
      id: p._id.toString(),
      playerCode: p.playerCode,
      name: p.name,
      age: calculateAge(p.dateOfBirth),
      dateOfBirth: p.dateOfBirth.toISOString(),
      gender: p.gender,
      sport: p.sport,
      position: p.position,
      photoUrl: p.photoUrl,
      enrollmentDate: p.enrollmentDate.toISOString(),
      contact: p.contact,
      status: p.status,
      coachId: coachDoc?._id ? coachDoc._id.toString() : p.coachId.toString(),
      coachName: coachDoc?.userId?.name || "Unassigned",
      hasLoginAccount: Boolean(p.userId),
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

export async function getPlayerById(academyId: string, playerId: string) {
  const player = await Player.findOne({
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  }).populate({
    path: "coachId",
    populate: { path: "userId", select: "name email" },
  });

  if (!player) {
    throw new NotFoundError("Player not found in this academy");
  }

  return player;
}

export async function updatePlayer(
  academyId: string,
  playerId: string,
  updates: Partial<CreatePlayerInput>,
  actorCoachId?: string
) {
  const player = await Player.findOne({
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!player) {
    throw new NotFoundError("Player not found");
  }

  // If updated by a coach, enforce coach-level ownership
  if (actorCoachId && player.coachId.toString() !== actorCoachId) {
    throw new ForbiddenError("Coaches can only update their own assigned players");
  }

  if (updates.name) player.name = updates.name.trim();
  if (updates.position) player.position = updates.position.trim();
  if (updates.gender) player.gender = updates.gender;
  if (updates.photoUrl !== undefined) player.photoUrl = updates.photoUrl;
  if (updates.dateOfBirth) player.dateOfBirth = new Date(updates.dateOfBirth);
  if (updates.contact) player.contact = { ...player.contact, ...updates.contact };

  await player.save();
  return player;
}
