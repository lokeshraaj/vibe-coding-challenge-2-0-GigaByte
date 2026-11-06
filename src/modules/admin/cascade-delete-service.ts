import mongoose from "mongoose";
import {
  Academy,
  User,
  Coach,
  Player,
  Scout,
  PracticeSession,
  Attendance,
  Match,
  MatchParticipant,
  Invitation,
  IdCounter,
  Complaint,
  AuditLog,
  OtpChallenge,
} from "@/models";
import { verifyPassword } from "@/lib/auth/password";
import { NotFoundError, BadRequestError, ForbiddenError } from "@/lib/errors";

// -------------------------------------------------------------
// ACADEMY CASCADE DELETION
// -------------------------------------------------------------

export interface AcademyImpactSummary {
  academy: {
    id: string;
    name: string;
    slug: string;
    status: string;
    owner: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  recordCounts: {
    coaches: number;
    players: number;
    scouts: number;
    practiceSessions: number;
    attendances: number;
    matches: number;
    matchParticipants: number;
    invitations: number;
    idCounters: number;
    complaints: number;
  };
  userImpact: {
    exclusiveUsersCount: number;
    sharedUsersCount: number;
    exclusiveUsers: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>;
    sharedUsers: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
    }>;
  };
}

export interface CascadeDeleteParams {
  academyId: string;
  adminId: string;
  reason: string;
  confirmName: string;
  reauthPassword?: string;
}

export interface CascadeDeleteResult {
  success: boolean;
  message: string;
  deletedAcademy: {
    id: string;
    name: string;
    slug: string;
  };
  deletedRecords: {
    coaches: number;
    players: number;
    scouts: number;
    practiceSessions: number;
    attendances: number;
    matches: number;
    matchParticipants: number;
    invitations: number;
    idCounters: number;
    complaints: number;
    exclusiveUsers: number;
  };
  preservedSharedUsersCount: number;
  auditLogId: string;
}

/**
 * Calculates pre-deletion impact preview for an academy without modifying any records.
 */
export async function calculateAcademyImpact(academyId: string): Promise<AcademyImpactSummary> {
  const academyObjectId = new mongoose.Types.ObjectId(academyId);

  const academy = await Academy.findById(academyObjectId).populate("ownerId", "name email").lean();
  if (!academy) {
    throw new NotFoundError(`Academy with ID '${academyId}' not found.`);
  }

  const [
    coachesCount,
    playersCount,
    scoutsCount,
    sessionsCount,
    attendancesCount,
    matchesCount,
    participantsCount,
    invitationsCount,
    idCountersCount,
    complaintsCount,
    usersInAcademy,
  ] = await Promise.all([
    Coach.countDocuments({ academyId: academyObjectId }),
    Player.countDocuments({ academyId: academyObjectId }),
    Scout.countDocuments({ academyId: academyObjectId }),
    PracticeSession.countDocuments({ academyId: academyObjectId }),
    Attendance.countDocuments({ academyId: academyObjectId }),
    Match.countDocuments({ academyId: academyObjectId }),
    MatchParticipant.countDocuments({ academyId: academyObjectId }),
    Invitation.countDocuments({ academyId: academyObjectId }),
    IdCounter.countDocuments({ academyId: academyObjectId }),
    Complaint.countDocuments({ academyId: academyObjectId }),
    User.find({ academyId: academyObjectId }).select("name email role").lean(),
  ]);

  // Determine exclusive vs shared / platform users
  const exclusiveUsers: Array<{ id: string; name: string; email: string; role: string }> = [];
  const sharedUsers: Array<{ id: string; name: string; email: string; role: string }> = [];

  for (const u of usersInAcademy) {
    const isPlatformAdmin = u.role === "SUPER_ADMIN" || u.role === "PLATFORM_ADMIN";
    if (isPlatformAdmin) {
      sharedUsers.push({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      });
      continue;
    }

    // Check if user has active memberships in other academies or profiles
    const otherAcademyProfilesCount = await Promise.all([
      Coach.countDocuments({ userId: u._id, academyId: { $ne: academyObjectId } }),
      Player.countDocuments({ userId: u._id, academyId: { $ne: academyObjectId } }),
      Scout.countDocuments({ userId: u._id, academyId: { $ne: academyObjectId } }),
      Academy.countDocuments({ ownerId: u._id, _id: { $ne: academyObjectId } }),
    ]);

    const totalOtherAssociations = otherAcademyProfilesCount.reduce((a, b) => a + b, 0);

    if (totalOtherAssociations > 0) {
      sharedUsers.push({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      });
    } else {
      exclusiveUsers.push({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
      });
    }
  }

  const ownerDoc = academy.ownerId as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string } | null;

  return {
    academy: {
      id: academy._id.toString(),
      name: academy.name,
      slug: academy.slug,
      status: academy.status,
      owner: ownerDoc
        ? {
            id: ownerDoc._id ? ownerDoc._id.toString() : "",
            name: ownerDoc.name,
            email: ownerDoc.email,
          }
        : null,
    },
    recordCounts: {
      coaches: coachesCount,
      players: playersCount,
      scouts: scoutsCount,
      practiceSessions: sessionsCount,
      attendances: attendancesCount,
      matches: matchesCount,
      matchParticipants: participantsCount,
      invitations: invitationsCount,
      idCounters: idCountersCount,
      complaints: complaintsCount,
    },
    userImpact: {
      exclusiveUsersCount: exclusiveUsers.length,
      sharedUsersCount: sharedUsers.length,
      exclusiveUsers,
      sharedUsers,
    },
  };
}

/**
 * Executes a permanent, comprehensive cascade deletion of an academy.
 * Strictly verifies super admin credentials, double confirmation, and preserves shared users & platform audit logs.
 */
export async function executeAcademyCascadeDelete(
  params: CascadeDeleteParams
): Promise<CascadeDeleteResult> {
  const { academyId, adminId, reason, confirmName, reauthPassword } = params;

  if (!reason || reason.trim().length < 5) {
    throw new BadRequestError("A specific deletion reason of at least 5 characters is required.");
  }

  // 1. Authenticate Admin and Step-up re-authentication
  const adminUser = await User.findById(adminId).select("+passwordHash");
  if (!adminUser) {
    throw new ForbiddenError("Administrator account not found.");
  }

  if (adminUser.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only the Primary SUPER_ADMIN can execute permanent academy cascade deletion.");
  }

  if (reauthPassword) {
    if (!adminUser.passwordHash) {
      throw new ForbiddenError("Administrative password authentication failed.");
    }
    const isPasswordValid = await verifyPassword(reauthPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenError("Invalid password. Re-authentication failed for permanent deletion.");
    }
  }

  // 2. Validate Academy exists and confirmName matches
  const academyObjectId = new mongoose.Types.ObjectId(academyId);
  const academy = await Academy.findById(academyObjectId);
  if (!academy) {
    throw new NotFoundError(`Academy with ID '${academyId}' not found.`);
  }

  if (academy.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
    throw new BadRequestError(
      `Confirmation mismatch. You typed '${confirmName}', but the exact academy name is '${academy.name}'.`
    );
  }

  // 3. Calculate impact & user isolation before deletion
  const impact = await calculateAcademyImpact(academyId);

  // 4. Staged Cascade Deletion
  academy.status = "DEACTIVATED";
  await academy.save();

  // Delete competition records exclusively owned by this academy
  const deletedParticipants = await MatchParticipant.deleteMany({ academyId: academyObjectId });
  const deletedMatches = await Match.deleteMany({ academyId: academyObjectId });

  // Delete attendance and training sessions
  const deletedAttendances = await Attendance.deleteMany({ academyId: academyObjectId });
  const deletedSessions = await PracticeSession.deleteMany({ academyId: academyObjectId });

  // Delete tenant setup, counters, and invitations
  const deletedInvitations = await Invitation.deleteMany({ academyId: academyObjectId });
  const deletedIdCounters = await IdCounter.deleteMany({ academyId: academyObjectId });
  const deletedComplaints = await Complaint.deleteMany({ academyId: academyObjectId });

  // Delete operational sports profiles
  const deletedScouts = await Scout.deleteMany({ academyId: academyObjectId });
  const deletedPlayers = await Player.deleteMany({ academyId: academyObjectId });
  const deletedCoaches = await Coach.deleteMany({ academyId: academyObjectId });

  // User handling — delete exclusive users, preserve shared/platform users
  const exclusiveUserIds = impact.userImpact.exclusiveUsers.map(
    (u) => new mongoose.Types.ObjectId(u.id)
  );

  let deletedExclusiveUsersCount = 0;
  if (exclusiveUserIds.length > 0) {
    const userDelResult = await User.deleteMany({
      _id: { $in: exclusiveUserIds },
      role: { $nin: ["SUPER_ADMIN", "PLATFORM_ADMIN"] },
    });
    deletedExclusiveUsersCount = userDelResult.deletedCount || 0;
  }

  // Detach shared users from the deleted academy tenant
  await User.updateMany(
    { academyId: academyObjectId },
    { $set: { academyId: null } }
  );

  // Delete Academy document
  await Academy.deleteOne({ _id: academyObjectId });

  // Retain independent platform audit log
  const auditLog = await AuditLog.create({
    actorId: adminUser._id,
    actorRole: adminUser.role,
    action: "CASCADE_DELETE_ACADEMY",
    resourceType: "ACADEMY",
    resourceId: academyId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      deletedAcademy: {
        id: academyId,
        name: academy.name,
        slug: academy.slug,
      },
      counts: {
        coaches: deletedCoaches.deletedCount || 0,
        players: deletedPlayers.deletedCount || 0,
        scouts: deletedScouts.deletedCount || 0,
        practiceSessions: deletedSessions.deletedCount || 0,
        attendances: deletedAttendances.deletedCount || 0,
        matches: deletedMatches.deletedCount || 0,
        matchParticipants: deletedParticipants.deletedCount || 0,
        invitations: deletedInvitations.deletedCount || 0,
        idCounters: deletedIdCounters.deletedCount || 0,
        complaints: deletedComplaints.deletedCount || 0,
        exclusiveUsers: deletedExclusiveUsersCount,
      },
      preservedSharedUsersCount: impact.userImpact.sharedUsersCount,
    },
  });

  return {
    success: true,
    message: `Academy '${academy.name}' and all exclusively owned records were permanently deleted. Shared accounts and audit logs were safely preserved.`,
    deletedAcademy: {
      id: academyId,
      name: academy.name,
      slug: academy.slug,
    },
    deletedRecords: {
      coaches: deletedCoaches.deletedCount || 0,
      players: deletedPlayers.deletedCount || 0,
      scouts: deletedScouts.deletedCount || 0,
      practiceSessions: deletedSessions.deletedCount || 0,
      attendances: deletedAttendances.deletedCount || 0,
      matches: deletedMatches.deletedCount || 0,
      matchParticipants: deletedParticipants.deletedCount || 0,
      invitations: deletedInvitations.deletedCount || 0,
      idCounters: deletedIdCounters.deletedCount || 0,
      complaints: deletedComplaints.deletedCount || 0,
      exclusiveUsers: deletedExclusiveUsersCount,
    },
    preservedSharedUsersCount: impact.userImpact.sharedUsersCount,
    auditLogId: auditLog._id.toString(),
  };
}

// -------------------------------------------------------------
// USER CASCADE DELETION
// -------------------------------------------------------------

export interface UserImpactSummary {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    academyName?: string;
  };
  profiles: {
    coach?: { id: string; sport: string; assignedPlayersCount: number };
    player?: { id: string; sport: string; matchCount: number; attendanceCount: number };
    scout?: { id: string };
    ownedAcademiesCount: number;
  };
  recordCounts: {
    attendances: number;
    matchParticipants: number;
    practiceSessions: number;
    complaints: number;
  };
}

export interface UserCascadeDeleteParams {
  userId: string;
  adminId: string;
  reason: string;
  confirmEmail?: string;
  reauthPassword?: string;
  reassignCoachId?: string;
}

export interface UserCascadeDeleteResult {
  success: boolean;
  message: string;
  deletedUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  deletedRecords: {
    coachProfiles: number;
    playerProfiles: number;
    scoutProfiles: number;
    attendances: number;
    matchParticipants: number;
    practiceSessions: number;
    complaints: number;
    reassignedPlayers: number;
  };
  auditLogId: string;
}

export async function calculateUserImpact(userId: string): Promise<UserImpactSummary> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userObjectId).populate("academyId", "name").lean();
  if (!user) {
    throw new NotFoundError(`User with ID '${userId}' not found.`);
  }

  const [coachDoc, playerDoc, scoutDoc, ownedAcademiesCount] = await Promise.all([
    Coach.findOne({ $or: [{ _id: user.coachId }, { userId: userObjectId }] }).lean(),
    Player.findOne({ $or: [{ _id: user.playerId }, { userId: userObjectId }] }).lean(),
    Scout.findOne({ userId: userObjectId }).lean(),
    Academy.countDocuments({ ownerId: userObjectId }),
  ]);

  let assignedPlayersCount = 0;
  let coachSessionsCount = 0;
  let coachAttendancesCount = 0;
  if (coachDoc) {
    const [players, sessions, attendances] = await Promise.all([
      Player.countDocuments({ coachId: coachDoc._id }),
      PracticeSession.countDocuments({ coachId: coachDoc._id }),
      Attendance.countDocuments({ coachId: coachDoc._id }),
    ]);
    assignedPlayersCount = players;
    coachSessionsCount = sessions;
    coachAttendancesCount = attendances;
  }

  let playerMatchesCount = 0;
  let playerAttendancesCount = 0;
  if (playerDoc) {
    const [matches, attendances] = await Promise.all([
      MatchParticipant.countDocuments({ playerId: playerDoc._id }),
      Attendance.countDocuments({ playerId: playerDoc._id }),
    ]);
    playerMatchesCount = matches;
    playerAttendancesCount = attendances;
  }

  const complaintsCount = await Complaint.countDocuments({ complainantId: userObjectId });

  const academyDoc = user.academyId as unknown as { name?: string } | null;

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      academyName: academyDoc?.name || undefined,
    },
    profiles: {
      coach: coachDoc
        ? {
            id: coachDoc._id.toString(),
            sport: coachDoc.sport,
            assignedPlayersCount,
          }
        : undefined,
      player: playerDoc
        ? {
            id: playerDoc._id.toString(),
            sport: playerDoc.sport,
            matchCount: playerMatchesCount,
            attendanceCount: playerAttendancesCount,
          }
        : undefined,
      scout: scoutDoc ? { id: scoutDoc._id.toString() } : undefined,
      ownedAcademiesCount,
    },
    recordCounts: {
      attendances: coachAttendancesCount + playerAttendancesCount,
      matchParticipants: playerMatchesCount,
      practiceSessions: coachSessionsCount,
      complaints: complaintsCount,
    },
  };
}

export async function executeUserCascadeDelete(
  params: UserCascadeDeleteParams
): Promise<UserCascadeDeleteResult> {
  const { userId, adminId, reason, confirmEmail, reauthPassword, reassignCoachId } = params;

  if (!reason || reason.trim().length < 3) {
    throw new BadRequestError("A specific deletion reason (at least 3 characters) is required.");
  }

  const adminUser = await User.findById(adminId).select("+passwordHash");
  if (!adminUser) {
    throw new ForbiddenError("Administrator account not found.");
  }

  if (adminUser.role !== "SUPER_ADMIN" && adminUser.role !== "PLATFORM_ADMIN") {
    throw new ForbiddenError("Administrative authority is required to permanently delete users.");
  }

  if (reauthPassword) {
    if (!adminUser.passwordHash) {
      throw new ForbiddenError("Administrative password authentication failed.");
    }
    const isPasswordValid = await verifyPassword(reauthPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenError("Invalid password. Re-authentication failed for permanent deletion.");
    }
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const targetUser = await User.findById(userObjectId);
  if (!targetUser) {
    throw new NotFoundError(`User with ID '${userId}' not found.`);
  }

  // 1. Strict Protection Rules
  if (targetUser.role === "SUPER_ADMIN") {
    throw new ForbiddenError("SUPER_ADMIN accounts cannot be deleted through user management.");
  }

  if (targetUser._id.toString() === adminUser._id.toString()) {
    throw new BadRequestError("Self-destruction blocked: You cannot delete your own account.");
  }

  if (targetUser.role === "PLATFORM_ADMIN" && adminUser.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only the Primary SUPER_ADMIN can delete PLATFORM_ADMIN accounts.");
  }

  if (confirmEmail && targetUser.email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
    throw new BadRequestError(
      `Confirmation mismatch. You typed '${confirmEmail}', but user's email is '${targetUser.email}'.`
    );
  }

  let coachProfilesDeleted = 0;
  let playerProfilesDeleted = 0;
  let scoutProfilesDeleted = 0;
  let attendancesDeleted = 0;
  let matchesDeleted = 0;
  let sessionsDeleted = 0;
  let complaintsDeleted = 0;
  let reassignedPlayers = 0;

  // 2. Cascade Coach Profile & Data
  const coachDoc = await Coach.findOne({
    $or: [{ _id: targetUser.coachId }, { userId: targetUser._id }],
  });

  if (coachDoc) {
    if (reassignCoachId && mongoose.Types.ObjectId.isValid(reassignCoachId)) {
      const updateResult = await Player.updateMany(
        { coachId: coachDoc._id },
        { $set: { coachId: new mongoose.Types.ObjectId(reassignCoachId) } }
      );
      reassignedPlayers = updateResult.modifiedCount || 0;
    } else {
      await Player.updateMany(
        { coachId: coachDoc._id },
        { $set: { coachId: null } }
      );
    }

    const delAtt = await Attendance.deleteMany({ coachId: coachDoc._id });
    attendancesDeleted += delAtt.deletedCount || 0;

    const delSess = await PracticeSession.deleteMany({ coachId: coachDoc._id });
    sessionsDeleted += delSess.deletedCount || 0;

    const delCoach = await Coach.deleteOne({ _id: coachDoc._id });
    coachProfilesDeleted = delCoach.deletedCount || 0;
  }

  // 3. Cascade Player Profile & Data
  const playerDoc = await Player.findOne({
    $or: [{ _id: targetUser.playerId }, { userId: targetUser._id }],
  });

  if (playerDoc) {
    const delParts = await MatchParticipant.deleteMany({ playerId: playerDoc._id });
    matchesDeleted += delParts.deletedCount || 0;

    const delAtt = await Attendance.deleteMany({ playerId: playerDoc._id });
    attendancesDeleted += delAtt.deletedCount || 0;

    const delPlayer = await Player.deleteOne({ _id: playerDoc._id });
    playerProfilesDeleted = delPlayer.deletedCount || 0;
  }

  // 4. Cascade Scout Profile
  const delScout = await Scout.deleteMany({ userId: targetUser._id });
  scoutProfilesDeleted = delScout.deletedCount || 0;

  // 5. Unlink Academy Ownership
  await Academy.updateMany(
    { ownerId: targetUser._id },
    { $set: { ownerId: null } }
  );

  // 6. Delete Complaints & Pending Challenges/Invitations
  const delComplaints = await Complaint.deleteMany({ complainantId: targetUser._id });
  complaintsDeleted = delComplaints.deletedCount || 0;

  await Promise.all([
    Invitation.deleteMany({ email: targetUser.email.toLowerCase() }),
    OtpChallenge.deleteMany({ email: targetUser.email.toLowerCase() }),
  ]);

  // 7. Permanently Delete User Document
  await User.deleteOne({ _id: targetUser._id });

  // 8. Record in Audit Log
  const auditLog = await AuditLog.create({
    actorId: adminUser._id,
    actorRole: adminUser.role,
    action: "CASCADE_DELETE_USER",
    resourceType: "USER",
    resourceId: userId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      deletedUser: {
        id: userId,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      counts: {
        coachProfiles: coachProfilesDeleted,
        playerProfiles: playerProfilesDeleted,
        scoutProfiles: scoutProfilesDeleted,
        attendances: attendancesDeleted,
        matchParticipants: matchesDeleted,
        practiceSessions: sessionsDeleted,
        complaints: complaintsDeleted,
        reassignedPlayers,
      },
    },
  });

  return {
    success: true,
    message: `User '${targetUser.name}' (${targetUser.email}) and all related database records were permanently deleted.`,
    deletedUser: {
      id: userId,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
    },
    deletedRecords: {
      coachProfiles: coachProfilesDeleted,
      playerProfiles: playerProfilesDeleted,
      scoutProfiles: scoutProfilesDeleted,
      attendances: attendancesDeleted,
      matchParticipants: matchesDeleted,
      practiceSessions: sessionsDeleted,
      complaints: complaintsDeleted,
      reassignedPlayers,
    },
    auditLogId: auditLog._id.toString(),
  };
}

// -------------------------------------------------------------
// COACH CASCADE DELETION
// -------------------------------------------------------------

export interface CoachImpactSummary {
  coach: {
    id: string;
    coachCode?: string;
    name: string;
    email: string;
    sport: string;
    academy: { id: string; name: string };
  };
  assignedPlayersCount: number;
  practiceSessionsCount: number;
  attendancesCount: number;
  hasUserAccount: boolean;
}

export interface CoachCascadeDeleteParams {
  coachId: string;
  adminId: string;
  reason: string;
  confirmName?: string;
  reauthPassword?: string;
  reassignCoachId?: string;
  deleteUserAccount?: boolean;
}

export interface CoachCascadeDeleteResult {
  success: boolean;
  message: string;
  deletedCoach: {
    id: string;
    name: string;
    sport: string;
  };
  deletedRecords: {
    coaches: number;
    practiceSessions: number;
    attendances: number;
    users: number;
    reassignedPlayers: number;
  };
  auditLogId: string;
}

export async function calculateCoachImpact(coachId: string): Promise<CoachImpactSummary> {
  const coachObjectId = new mongoose.Types.ObjectId(coachId);
  const coach = await Coach.findById(coachObjectId)
    .populate("userId", "name email")
    .populate("academyId", "name")
    .lean();

  if (!coach) {
    throw new NotFoundError(`Coach with ID '${coachId}' not found.`);
  }

  const [playersCount, sessionsCount, attendancesCount] = await Promise.all([
    Player.countDocuments({ coachId: coachObjectId }),
    PracticeSession.countDocuments({ coachId: coachObjectId }),
    Attendance.countDocuments({ coachId: coachObjectId }),
  ]);

  const userDoc = coach.userId as unknown as { name?: string; email?: string } | null;
  const academyDoc = coach.academyId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | null;

  return {
    coach: {
      id: coach._id.toString(),
      coachCode: coach.coachCode,
      name: userDoc?.name || "Unknown Coach",
      email: userDoc?.email || "",
      sport: coach.sport,
      academy: {
        id: academyDoc?._id ? academyDoc._id.toString() : "",
        name: academyDoc?.name || "Unassigned Academy",
      },
    },
    assignedPlayersCount: playersCount,
    practiceSessionsCount: sessionsCount,
    attendancesCount: attendancesCount,
    hasUserAccount: !!coach.userId,
  };
}

export async function executeCoachCascadeDelete(
  params: CoachCascadeDeleteParams
): Promise<CoachCascadeDeleteResult> {
  const { coachId, adminId, reason, confirmName, reauthPassword, reassignCoachId, deleteUserAccount = true } = params;

  if (!reason || reason.trim().length < 3) {
    throw new BadRequestError("A specific deletion reason (at least 3 characters) is required.");
  }

  const adminUser = await User.findById(adminId).select("+passwordHash");
  if (!adminUser) {
    throw new ForbiddenError("Administrator account not found.");
  }

  if (adminUser.role !== "SUPER_ADMIN" && adminUser.role !== "PLATFORM_ADMIN") {
    throw new ForbiddenError("Administrative authority is required to delete coaches.");
  }

  if (reauthPassword) {
    if (!adminUser.passwordHash) {
      throw new ForbiddenError("Administrative password authentication failed.");
    }
    const isPasswordValid = await verifyPassword(reauthPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenError("Invalid password. Re-authentication failed for permanent deletion.");
    }
  }

  const coachObjectId = new mongoose.Types.ObjectId(coachId);
  const coach = await Coach.findById(coachObjectId).populate("userId", "name email role");
  if (!coach) {
    throw new NotFoundError(`Coach with ID '${coachId}' not found.`);
  }

  const coachUser = coach.userId as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string; role: string } | null;

  if (confirmName && coachUser?.name && coachUser.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
    throw new BadRequestError(
      `Confirmation mismatch. You typed '${confirmName}', but coach's name is '${coachUser.name}'.`
    );
  }

  // Handle assigned players
  let reassignedPlayers = 0;
  if (reassignCoachId && mongoose.Types.ObjectId.isValid(reassignCoachId)) {
    const updateResult = await Player.updateMany(
      { coachId: coach._id },
      { $set: { coachId: new mongoose.Types.ObjectId(reassignCoachId) } }
    );
    reassignedPlayers = updateResult.modifiedCount || 0;
  } else {
    await Player.updateMany(
      { coachId: coach._id },
      { $set: { coachId: null } }
    );
  }

  // Cascade delete sessions and attendance
  const delAtt = await Attendance.deleteMany({ coachId: coach._id });
  const delSess = await PracticeSession.deleteMany({ coachId: coach._id });

  // Delete coach record
  const delCoach = await Coach.deleteOne({ _id: coach._id });

  // Optionally delete underlying user account if it only served as COACH
  let usersDeleted = 0;
  if (deleteUserAccount && coachUser && coachUser.role === "COACH") {
    const delUser = await User.deleteOne({ _id: coachUser._id });
    usersDeleted = delUser.deletedCount || 0;
  }

  const auditLog = await AuditLog.create({
    actorId: adminUser._id,
    actorRole: adminUser.role,
    action: "CASCADE_DELETE_COACH",
    resourceType: "COACH",
    resourceId: coachId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      deletedCoach: {
        id: coachId,
        name: coachUser?.name || "Unknown",
        sport: coach.sport,
      },
      counts: {
        coaches: delCoach.deletedCount || 0,
        practiceSessions: delSess.deletedCount || 0,
        attendances: delAtt.deletedCount || 0,
        users: usersDeleted,
        reassignedPlayers,
      },
    },
  });

  return {
    success: true,
    message: `Coach '${coachUser?.name || coach.sport}' and related training records were permanently deleted from the database.`,
    deletedCoach: {
      id: coachId,
      name: coachUser?.name || "Unknown",
      sport: coach.sport,
    },
    deletedRecords: {
      coaches: delCoach.deletedCount || 0,
      practiceSessions: delSess.deletedCount || 0,
      attendances: delAtt.deletedCount || 0,
      users: usersDeleted,
      reassignedPlayers,
    },
    auditLogId: auditLog._id.toString(),
  };
}

// -------------------------------------------------------------
// PLAYER CASCADE DELETION
// -------------------------------------------------------------

export interface PlayerImpactSummary {
  player: {
    id: string;
    playerCode: string;
    name: string;
    sport: string;
    position: string;
    academy: { id: string; name: string };
  };
  matchParticipantsCount: number;
  attendancesCount: number;
  hasUserAccount: boolean;
}

export interface PlayerCascadeDeleteParams {
  playerId: string;
  adminId: string;
  reason: string;
  confirmName?: string;
  reauthPassword?: string;
  deleteUserAccount?: boolean;
}

export interface PlayerCascadeDeleteResult {
  success: boolean;
  message: string;
  deletedPlayer: {
    id: string;
    name: string;
    playerCode: string;
    sport: string;
  };
  deletedRecords: {
    players: number;
    matchParticipants: number;
    attendances: number;
    users: number;
  };
  auditLogId: string;
}

export async function calculatePlayerImpact(playerId: string): Promise<PlayerImpactSummary> {
  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const player = await Player.findById(playerObjectId)
    .populate("academyId", "name")
    .lean();

  if (!player) {
    throw new NotFoundError(`Player with ID '${playerId}' not found.`);
  }

  const [matchesCount, attendancesCount] = await Promise.all([
    MatchParticipant.countDocuments({ playerId: playerObjectId }),
    Attendance.countDocuments({ playerId: playerObjectId }),
  ]);

  const academyDoc = player.academyId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | null;

  return {
    player: {
      id: player._id.toString(),
      playerCode: player.playerCode,
      name: player.name,
      sport: player.sport,
      position: player.position,
      academy: {
        id: academyDoc?._id ? academyDoc._id.toString() : "",
        name: academyDoc?.name || "Unassigned Academy",
      },
    },
    matchParticipantsCount: matchesCount,
    attendancesCount: attendancesCount,
    hasUserAccount: !!player.userId,
  };
}

export async function executePlayerCascadeDelete(
  params: PlayerCascadeDeleteParams
): Promise<PlayerCascadeDeleteResult> {
  const { playerId, adminId, reason, confirmName, reauthPassword, deleteUserAccount = true } = params;

  if (!reason || reason.trim().length < 3) {
    throw new BadRequestError("A specific deletion reason (at least 3 characters) is required.");
  }

  const adminUser = await User.findById(adminId).select("+passwordHash");
  if (!adminUser) {
    throw new ForbiddenError("Administrator account not found.");
  }

  if (adminUser.role !== "SUPER_ADMIN" && adminUser.role !== "PLATFORM_ADMIN") {
    throw new ForbiddenError("Administrative authority is required to delete players.");
  }

  if (reauthPassword) {
    if (!adminUser.passwordHash) {
      throw new ForbiddenError("Administrative password authentication failed.");
    }
    const isPasswordValid = await verifyPassword(reauthPassword, adminUser.passwordHash);
    if (!isPasswordValid) {
      throw new ForbiddenError("Invalid password. Re-authentication failed for permanent deletion.");
    }
  }

  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const player = await Player.findById(playerObjectId);
  if (!player) {
    throw new NotFoundError(`Player with ID '${playerId}' not found.`);
  }

  if (confirmName && player.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
    throw new BadRequestError(
      `Confirmation mismatch. You typed '${confirmName}', but player's name is '${player.name}'.`
    );
  }

  // 1. Delete match participation
  const delParts = await MatchParticipant.deleteMany({ playerId: player._id });

  // 2. Delete attendance records
  const delAtt = await Attendance.deleteMany({ playerId: player._id });

  // 3. Delete Player document
  const delPlayer = await Player.deleteOne({ _id: player._id });

  // 4. Optionally delete linked user account if it only exists for this player
  let usersDeleted = 0;
  if (deleteUserAccount && player.userId) {
    const linkedUser = await User.findById(player.userId);
    if (linkedUser && linkedUser.role === "PLAYER") {
      const delUser = await User.deleteOne({ _id: linkedUser._id });
      usersDeleted = delUser.deletedCount || 0;
    }
  }

  const auditLog = await AuditLog.create({
    actorId: adminUser._id,
    actorRole: adminUser.role,
    action: "CASCADE_DELETE_PLAYER",
    resourceType: "PLAYER",
    resourceId: playerId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      deletedPlayer: {
        id: playerId,
        name: player.name,
        playerCode: player.playerCode,
        sport: player.sport,
      },
      counts: {
        players: delPlayer.deletedCount || 0,
        matchParticipants: delParts.deletedCount || 0,
        attendances: delAtt.deletedCount || 0,
        users: usersDeleted,
      },
    },
  });

  return {
    success: true,
    message: `Player '${player.name}' (${player.playerCode}) and all attendance/match records were permanently deleted.`,
    deletedPlayer: {
      id: playerId,
      name: player.name,
      playerCode: player.playerCode,
      sport: player.sport,
    },
    deletedRecords: {
      players: delPlayer.deletedCount || 0,
      matchParticipants: delParts.deletedCount || 0,
      attendances: delAtt.deletedCount || 0,
      users: usersDeleted,
    },
    auditLogId: auditLog._id.toString(),
  };
}
