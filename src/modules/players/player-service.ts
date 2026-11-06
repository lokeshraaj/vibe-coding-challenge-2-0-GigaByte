import mongoose from "mongoose";
import { Player, Coach, User, Academy, AuditLog } from "@/models";
import { calculateAge } from "@/lib/utils";
import { generateAthlixId } from "@/lib/id-generator";
import { sendPlayerNotificationEmail } from "@/lib/email/brevo";
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

export async function createPlayer(input: CreatePlayerInput, actorId?: string) {
  // Verify coach belongs to the same academy
  const coach = await Coach.findOne({
    _id: new mongoose.Types.ObjectId(input.coachId),
    academyId: new mongoose.Types.ObjectId(input.academyId),
  });

  if (!coach) {
    throw new NotFoundError("Assigned coach does not exist in this academy.");
  }

  const academy = await Academy.findById(new mongoose.Types.ObjectId(input.academyId));
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  // Generate atomic, collision-free Player ID (e.g. PLFO001)
  const playerCode = await generateAthlixId({
    academyId: input.academyId,
    userType: "PLAYER",
    sport: input.sport,
  });

  const playerId = new mongoose.Types.ObjectId();
  let userId: mongoose.Types.ObjectId | undefined = undefined;
  const hasEmail = Boolean(input.contact?.email?.trim());
  const normalizedEmail = input.contact?.email?.trim().toLowerCase();

  // If email is provided, create pending user identity for ID-based activation
  if (hasEmail && normalizedEmail) {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError("A user account with this player email already exists.");
    }

    userId = new mongoose.Types.ObjectId();
    await User.create({
      _id: userId,
      academyId: new mongoose.Types.ObjectId(input.academyId),
      role: "PLAYER",
      name: input.name.trim(),
      email: normalizedEmail,
      playerId: playerId,
      status: "PENDING",
      metadata: {
        phone: input.contact?.phone?.trim() || "",
      },
    });
  }

  const player = await Player.create({
    _id: playerId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
    userId: userId || null,
    playerCode: playerCode,
    name: input.name.trim(),
    dateOfBirth: new Date(input.dateOfBirth),
    gender: input.gender || "MALE",
    sport: input.sport.trim(),
    position: input.position.trim(),
    photoUrl: input.photoUrl || "",
    enrollmentDate: new Date(input.enrollmentDate),
    contact: input.contact || {},
    accountStatus: hasEmail ? "PENDING" : "ACTIVE",
    status: "ACTIVE",
  });

  // Record audit log
  try {
    if (actorId) {
      await AuditLog.create({
        academyId: new mongoose.Types.ObjectId(input.academyId),
        actorId: new mongoose.Types.ObjectId(actorId),
        action: "PLAYER_ENROLLED",
        resourceType: "PLAYER",
        resourceId: playerCode,
        details: { name: player.name, playerCode, coachId: input.coachId },
      });
    }
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }

  // Send informational notification email via Brevo if email was provided
  if (hasEmail && normalizedEmail) {
    try {
      await sendPlayerNotificationEmail({
        toEmail: normalizedEmail,
        playerName: player.name,
        playerId: playerCode,
        academyName: academy.name,
        academyCode: academy.academyCode || "",
        sport: player.sport,
      });
    } catch (emailErr) {
      console.error("[Brevo Notification Warning] Email delivery failed, ID preserved:", emailErr);
    }
  }

  return {
    id: player._id.toString(),
    playerCode: player.playerCode,
    name: player.name,
    sport: player.sport,
    position: player.position,
    age: calculateAge(player.dateOfBirth),
    coachId: player.coachId.toString(),
    status: player.status,
    accountStatus: player.accountStatus,
    hasLoginAccount: Boolean(userId),
  };
}

export async function resendPlayerNotification(academyId: string, playerId: string) {
  const player = await Player.findOne({
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!player || !player.contact?.email) {
    throw new NotFoundError("Player record or email not found");
  }

  const academy = await Academy.findById(new mongoose.Types.ObjectId(academyId));
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  await sendPlayerNotificationEmail({
    toEmail: player.contact.email,
    playerName: player.name,
    playerId: player.playerCode,
    academyName: academy.name,
    academyCode: academy.academyCode || "",
    sport: player.sport,
  });

  return { success: true, message: `Notification re-sent to ${player.contact.email}` };
}

export async function listPlayers(filter: PlayerFilterQuery) {
  const query: Record<string, unknown> = {
    academyId: new mongoose.Types.ObjectId(filter.academyId),
  };

  if (filter.coachId) {
    query.coachId = new mongoose.Types.ObjectId(filter.coachId);
  }

  if (filter.sport) {
    query.sport = filter.sport;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      { playerCode: { $regex: filter.search, $options: "i" } },
      { "contact.email": { $regex: filter.search, $options: "i" } },
    ];
  }

  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const skip = (page - 1) * limit;

  const [items, totalCount] = await Promise.all([
    Player.find(query)
      .populate("coachId", "sport specialization userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Player.countDocuments(query),
  ]);

  const mappedItems = items.map((p) => {
    return {
      id: p._id.toString(),
      playerCode: p.playerCode,
      name: p.name,
      dateOfBirth: p.dateOfBirth.toISOString().split("T")[0],
      age: calculateAge(p.dateOfBirth),
      gender: p.gender,
      sport: p.sport,
      position: p.position,
      photoUrl: p.photoUrl,
      enrollmentDate: p.enrollmentDate.toISOString().split("T")[0],
      coachId: p.coachId ? (p.coachId as any)._id?.toString() || p.coachId.toString() : "",
      contact: p.contact,
      status: p.status,
      accountStatus: p.accountStatus || "ACTIVE",
      hasLoginAccount: Boolean(p.userId),
      createdAt: p.createdAt.toISOString(),
    };
  });

  return {
    items: mappedItems,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page * limit < totalCount,
      hasPrevPage: page > 1,
    },
  };
}

export async function getPlayerById(academyId: string, playerId: string) {
  const player = await Player.findOne({
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  }).populate("coachId", "sport specialization userId");

  if (!player) {
    throw new NotFoundError("Athlete not found in this academy");
  }

  return player;
}

export async function updatePlayer(
  academyId: string,
  playerId: string,
  updates: Partial<CreatePlayerInput>,
  coachId?: string
) {
  const query: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  };

  if (coachId) {
    query.coachId = new mongoose.Types.ObjectId(coachId);
  }

  const player = await Player.findOne(query);

  if (!player) {
    throw new NotFoundError("Athlete not found in this academy");
  }

  if (updates.name) player.name = updates.name.trim();
  if (updates.position) player.position = updates.position.trim();
  if (updates.gender) player.gender = updates.gender;
  if (updates.dateOfBirth) player.dateOfBirth = new Date(updates.dateOfBirth);
  if (updates.contact) {
    player.contact = {
      ...player.contact,
      ...updates.contact,
    };
  }

  await player.save();
  return player;
}
