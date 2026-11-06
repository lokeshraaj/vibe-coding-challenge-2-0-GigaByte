import mongoose from "mongoose";
import {
  Academy,
  User,
  Coach,
  Player,
  Scout,
  PracticeSession,
  Match,
  MatchParticipant,
  AuditLog,
  Complaint,
  PlatformSetting,
  Announcement,
} from "@/models";
import { NotFoundError, BadRequestError, ForbiddenError } from "@/lib/errors";

export interface GlobalStatsResult {
  academies: {
    total: number;
    active: number;
    blocked: number;
    suspended: number;
    pending: number;
  };
  coaches: {
    total: number;
    active: number;
    inactive: number;
  };
  players: {
    total: number;
    active: number;
    injured: number;
    deactivated: number;
  };
  scouts: {
    total: number;
    active: number;
  };
  owners: {
    total: number;
  };
  matches: {
    total: number;
  };
  users: {
    total: number;
    active: number;
    blocked: number;
    pending: number;
    deactivated: number;
  };
  registrationAnalytics: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    timeline: Array<{
      date: string;
      academies: number;
      coaches: number;
      players: number;
      total: number;
    }>;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    reason?: string;
    actorName: string;
    actorRole: string;
    createdAt: string;
  }>;
}

/**
 * Returns comprehensive platform telemetry and registration analytics.
 */
export async function getGlobalPlatformStats(filters?: {
  startDate?: string;
  endDate?: string;
  sport?: string;
  status?: string;
}): Promise<GlobalStatsResult> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Academy counts
  const [
    totalAcademies,
    activeAcademies,
    blockedAcademies,
    suspendedAcademies,
    pendingAcademies,
  ] = await Promise.all([
    Academy.countDocuments(),
    Academy.countDocuments({ status: "ACTIVE" }),
    Academy.countDocuments({ status: "BLOCKED" }),
    Academy.countDocuments({ status: "SUSPENDED" }),
    Academy.countDocuments({ status: "PENDING" }),
  ]);

  // 2. Coaches & Players & Scouts
  const [
    totalCoaches,
    activeCoaches,
    inactiveCoaches,
    totalPlayers,
    activePlayers,
    injuredPlayers,
    deactivatedPlayers,
    totalScouts,
    activeScouts,
    totalOwners,
    totalMatches,
  ] = await Promise.all([
    Coach.countDocuments(),
    Coach.countDocuments({ status: "ACTIVE" }),
    Coach.countDocuments({ status: "INACTIVE" }),
    Player.countDocuments(),
    Player.countDocuments({ status: "ACTIVE" }),
    Player.countDocuments({ status: "INJURED" }),
    Player.countDocuments({ status: "DEACTIVATED" }),
    Scout.countDocuments(),
    Scout.countDocuments({ status: "ACTIVE" }),
    User.countDocuments({ role: "ACADEMY_OWNER" }),
    Match.countDocuments(),
  ]);

  // 3. User accounts
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    pendingUsers,
    deactivatedUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "ACTIVE" }),
    User.countDocuments({ status: "BLOCKED" }),
    User.countDocuments({ status: "PENDING" }),
    User.countDocuments({ status: "DEACTIVATED" }),
  ]);

  // 4. Registration Velocity
  const [todayRegistrations, weekRegistrations, monthRegistrations] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  // 5. Growth Timeline (Last 14 days grouped by date)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [academyRegistrations, coachRegistrations, playerRegistrations] = await Promise.all([
    Academy.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Coach.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Player.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Merge timeline map
  const timelineMap: Record<string, { academies: number; coaches: number; players: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    timelineMap[key] = { academies: 0, coaches: 0, players: 0 };
  }

  academyRegistrations.forEach((r) => {
    if (timelineMap[r._id]) timelineMap[r._id].academies = r.count;
  });
  coachRegistrations.forEach((r) => {
    if (timelineMap[r._id]) timelineMap[r._id].coaches = r.count;
  });
  playerRegistrations.forEach((r) => {
    if (timelineMap[r._id]) timelineMap[r._id].players = r.count;
  });

  const timeline = Object.entries(timelineMap).map(([date, vals]) => ({
    date,
    academies: vals.academies,
    coaches: vals.coaches,
    players: vals.players,
    total: vals.academies + vals.coaches + vals.players,
  }));

  // 6. Recent Platform Activities
  const recentLogs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("actorId", "name role")
    .lean();

  const recentActivities = recentLogs.map((log) => {
    const actor = log.actorId as unknown as { name?: string; role?: string } | null;
    return {
      id: log._id.toString(),
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      reason: log.reason || "",
      actorName: actor?.name || "System Administrator",
      actorRole: log.actorRole || actor?.role || "SUPER_ADMIN",
      createdAt: log.createdAt.toISOString(),
    };
  });

  return {
    academies: {
      total: totalAcademies,
      active: activeAcademies,
      blocked: blockedAcademies,
      suspended: suspendedAcademies,
      pending: pendingAcademies,
    },
    coaches: {
      total: totalCoaches,
      active: activeCoaches,
      inactive: inactiveCoaches,
    },
    players: {
      total: totalPlayers,
      active: activePlayers,
      injured: injuredPlayers,
      deactivated: deactivatedPlayers,
    },
    scouts: {
      total: totalScouts,
      active: activeScouts,
    },
    owners: {
      total: totalOwners,
    },
    matches: {
      total: totalMatches,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
      pending: pendingUsers,
      deactivated: deactivatedUsers,
    },
    registrationAnalytics: {
      today: todayRegistrations,
      thisWeek: weekRegistrations,
      thisMonth: monthRegistrations,
      timeline,
    },
    recentActivities,
  };
}

/**
 * Lists all registered academies with server-side pagination, search, and status filters.
 */
export async function getAcademiesDirectory(params: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 15));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.status && params.status !== "ALL") {
    query.status = params.status;
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { slug: { $regex: s, $options: "i" } },
      { "location.city": { $regex: s, $options: "i" } },
      { "location.country": { $regex: s, $options: "i" } },
      { contactEmail: { $regex: s, $options: "i" } },
    ];
  }

  const [total, academies] = await Promise.all([
    Academy.countDocuments(query),
    Academy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("ownerId", "name email status")
      .lean(),
  ]);

  // Aggregate coach, player, scout counts for the returned academies
  const academyIds = academies.map((a) => a._id);

  const [coachesGroup, playersGroup, scoutsGroup] = await Promise.all([
    Coach.aggregate([
      { $match: { academyId: { $in: academyIds } } },
      { $group: { _id: "$academyId", count: { $sum: 1 } } },
    ]),
    Player.aggregate([
      { $match: { academyId: { $in: academyIds } } },
      { $group: { _id: "$academyId", count: { $sum: 1 } } },
    ]),
    Scout.aggregate([
      { $match: { academyId: { $in: academyIds } } },
      { $group: { _id: "$academyId", count: { $sum: 1 } } },
    ]),
  ]);

  const coachMap = new Map(coachesGroup.map((g) => [g._id.toString(), g.count]));
  const playerMap = new Map(playersGroup.map((g) => [g._id.toString(), g.count]));
  const scoutMap = new Map(scoutsGroup.map((g) => [g._id.toString(), g.count]));

  const items = academies.map((a) => {
    const id = a._id.toString();
    const owner = a.ownerId as unknown as { name?: string; email?: string; status?: string } | null;
    return {
      id,
      name: a.name,
      slug: a.slug,
      academyCode: a.academyCode || "",
      logo: a.logo || "",
      city: a.location?.city || "",
      state: a.location?.state || "",
      country: a.location?.country || "",
      contactEmail: a.contactEmail,
      contactPhone: a.contactPhone,
      status: a.status,
      blockedReason: a.blockedReason || "",
      ownerName: owner?.name || "Unassigned",
      ownerEmail: owner?.email || "",
      ownerStatus: owner?.status || "ACTIVE",
      totalCoaches: coachMap.get(id) || 0,
      totalPlayers: playerMap.get(id) || 0,
      totalScouts: scoutMap.get(id) || 0,
      createdAt: a.createdAt.toISOString(),
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Returns comprehensive details for a single academy.
 */
export async function getAcademyDetails(academyId: string) {
  const academy = await Academy.findById(academyId).populate("ownerId", "name email status createdAt metadata").lean();
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  const academyObjectId = academy._id;

  const [
    coaches,
    players,
    scouts,
    sessions,
    matches,
    auditLogs,
  ] = await Promise.all([
    Coach.find({ academyId: academyObjectId }).populate("userId", "name email status").limit(50).lean(),
    Player.find({ academyId: academyObjectId }).limit(50).lean(),
    Scout.find({ academyId: academyObjectId }).populate("userId", "name email").limit(20).lean(),
    PracticeSession.find({ academyId: academyObjectId }).sort({ date: -1 }).limit(10).lean(),
    Match.find({ academyId: academyObjectId }).sort({ date: -1 }).limit(10).lean(),
    AuditLog.find({
      $or: [{ academyId: academyObjectId }, { resourceId: academyId }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("actorId", "name role")
      .lean(),
  ]);

  return {
    academy: {
      id: academy._id.toString(),
      name: academy.name,
      slug: academy.slug,
      academyCode: academy.academyCode,
      description: academy.description,
      logo: academy.logo,
      location: academy.location,
      contactEmail: academy.contactEmail,
      contactPhone: academy.contactPhone,
      status: academy.status,
      blockedReason: academy.blockedReason,
      blockedAt: academy.blockedAt?.toISOString(),
      createdAt: academy.createdAt.toISOString(),
      owner: academy.ownerId,
    },
    counts: {
      coaches: coaches.length,
      players: players.length,
      scouts: scouts.length,
      sessions: sessions.length,
      matches: matches.length,
    },
    coaches: coaches.map((c) => ({
      id: c._id.toString(),
      code: c.coachCode,
      sport: c.sport,
      status: c.status,
      accountStatus: c.accountStatus,
      user: c.userId,
    })),
    players: players.map((p) => ({
      id: p._id.toString(),
      code: p.playerCode,
      name: p.name,
      sport: p.sport,
      position: p.position,
      status: p.status,
      accountStatus: p.accountStatus,
      enrollmentDate: p.enrollmentDate.toISOString(),
    })),
    scouts: scouts.map((s) => ({
      id: s._id.toString(),
      code: s.scoutCode,
      status: s.status,
      user: s.userId,
    })),
    recentSessions: sessions.map((s) => ({
      id: s._id.toString(),
      sport: s.sport,
      date: s.date.toISOString(),
      status: s.status,
      title: s.title,
    })),
    recentMatches: matches.map((m) => ({
      id: m._id.toString(),
      sport: m.sport,
      opponent: m.opponentName,
      date: m.date.toISOString(),
      score: `${m.academyTeamScore} - ${m.opponentScore}`,
      result: m.result,
    })),
    auditLogs: auditLogs.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      reason: l.reason,
      status: l.status,
      actor: l.actorId,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

/**
 * Updates an academy's status (BLOCK, UNBLOCK, SUSPEND, REACTIVATE) with audit tracking.
 */
export async function updateAcademyStatus(params: {
  academyId: string;
  status: "ACTIVE" | "BLOCKED" | "SUSPENDED" | "DEACTIVATED";
  reason: string;
  adminId: string;
}) {
  const { academyId, status, reason, adminId } = params;

  if (!reason || reason.trim().length < 3) {
    throw new BadRequestError("A specific reason of at least 3 characters is required.");
  }

  const academy = await Academy.findById(academyId);
  if (!academy) {
    throw new NotFoundError("Academy not found");
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    throw new ForbiddenError("Administrator not found");
  }

  const oldStatus = academy.status;
  academy.status = status;

  if (status === "BLOCKED" || status === "SUSPENDED") {
    academy.blockedReason = reason.trim();
    academy.blockedAt = new Date();
    academy.blockedBy = admin._id;
  } else if (status === "ACTIVE") {
    academy.blockedReason = "";
    academy.blockedAt = undefined;
    academy.blockedBy = undefined;
  }

  await academy.save();

  // Create audit log
  await AuditLog.create({
    academyId: academy._id,
    actorId: admin._id,
    actorRole: admin.role,
    action: `ACADEMY_STATUS_${status}`,
    resourceType: "ACADEMY",
    resourceId: academyId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      oldStatus,
      newStatus: status,
      academyName: academy.name,
    },
  });

  return {
    success: true,
    academyId,
    oldStatus,
    newStatus: status,
    message: `Academy '${academy.name}' status updated to ${status}.`,
  };
}

/**
 * Lists all users with server-side pagination, search, role and status filtering.
 */
export async function getUsersDirectory(params: {
  search?: string;
  role?: string;
  status?: string;
  academyId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 15));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.role && params.role !== "ALL") {
    query.role = params.role;
  }

  if (params.status && params.status !== "ALL") {
    query.status = params.status;
  }

  if (params.academyId) {
    query.academyId = new mongoose.Types.ObjectId(params.academyId);
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { "metadata.phone": { $regex: s, $options: "i" } },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("academyId", "name slug academyCode")
      .lean(),
  ]);

  return {
    items: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      blockedReason: u.blockedReason || "",
      phone: u.metadata?.phone || "",
      academy: u.academyId as unknown as { name?: string; slug?: string; academyCode?: string } | null,
      lastLoginAt: u.metadata?.lastLoginAt ? new Date(u.metadata.lastLoginAt).toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Returns complete profile details for an individual user.
 */
export async function getUserDetails(userId: string) {
  const user = await User.findById(userId).populate("academyId", "name slug academyCode status").lean();
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const [coachProfile, playerProfile, scoutProfile, auditHistory] = await Promise.all([
    Coach.findOne({ userId: user._id }).lean(),
    Player.findOne({ userId: user._id }).lean(),
    Scout.findOne({ userId: user._id }).lean(),
    AuditLog.find({
      $or: [{ actorId: user._id }, { resourceId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      blockedReason: user.blockedReason || "",
      blockedAt: user.blockedAt?.toISOString(),
      adminPermissions: user.adminPermissions || [],
      metadata: user.metadata,
      academy: user.academyId,
      createdAt: user.createdAt.toISOString(),
    },
    profiles: {
      coach: coachProfile
        ? {
            id: coachProfile._id.toString(),
            code: coachProfile.coachCode,
            sport: coachProfile.sport,
            status: coachProfile.status,
            accountStatus: coachProfile.accountStatus,
          }
        : null,
      player: playerProfile
        ? {
            id: playerProfile._id.toString(),
            code: playerProfile.playerCode,
            sport: playerProfile.sport,
            position: playerProfile.position,
            status: playerProfile.status,
            accountStatus: playerProfile.accountStatus,
          }
        : null,
      scout: scoutProfile
        ? {
            id: scoutProfile._id.toString(),
            code: scoutProfile.scoutCode,
            status: scoutProfile.status,
          }
        : null,
    },
    auditHistory: auditHistory.map((a) => ({
      id: a._id.toString(),
      action: a.action,
      resourceType: a.resourceType,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

/**
 * Updates individual user status (BLOCK, UNBLOCK, DEACTIVATE, ACTIVATE).
 * Strictly prevents self-blocking and blocking the last active Super Admin.
 */
export async function updateUserStatus(params: {
  targetUserId: string;
  status: "ACTIVE" | "BLOCKED" | "DEACTIVATED";
  reason: string;
  adminId: string;
}) {
  const { targetUserId, status, reason, adminId } = params;

  if (targetUserId === adminId) {
    throw new BadRequestError("Self-modification blocked: You cannot block or deactivate your own account.");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError("Target user not found");
  }

  // Prevent blocking the last active Super Admin
  if (targetUser.role === "SUPER_ADMIN" && status === "BLOCKED") {
    const activeSuperAdmins = await User.countDocuments({
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      _id: { $ne: targetUser._id },
    });
    if (activeSuperAdmins === 0) {
      throw new ForbiddenError("Cannot block the last active Super Admin account on the platform.");
    }
  }

  const admin = await User.findById(adminId);
  if (!admin) {
    throw new ForbiddenError("Administrator not found");
  }

  const oldStatus = targetUser.status;
  targetUser.status = status;

  if (status === "BLOCKED") {
    targetUser.blockedReason = reason.trim();
    targetUser.blockedAt = new Date();
    targetUser.blockedBy = admin._id;
  } else if (status === "ACTIVE") {
    targetUser.blockedReason = "";
    targetUser.blockedAt = undefined;
    targetUser.blockedBy = undefined;
  }

  await targetUser.save();

  // Log action
  await AuditLog.create({
    actorId: admin._id,
    actorRole: admin.role,
    action: `USER_STATUS_${status}`,
    resourceType: "USER",
    resourceId: targetUserId,
    reason: reason.trim(),
    status: "SUCCESS",
    details: {
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
      oldStatus,
      newStatus: status,
    },
  });

  return {
    success: true,
    userId: targetUserId,
    oldStatus,
    newStatus: status,
    message: `User '${targetUser.name}' status updated to ${status}.`,
  };
}

/**
 * Returns verification queue for coaches and players.
 */
export async function getVerificationQueue(params: {
  filter?: "ALL" | "PENDING" | "ACTIVE" | "SUSPICIOUS";
  userType?: "ALL" | "COACH" | "PLAYER";
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const coachQuery: Record<string, unknown> = {};
  const playerQuery: Record<string, unknown> = {};

  if (params.filter && params.filter !== "ALL") {
    if (params.filter === "PENDING") {
      coachQuery.accountStatus = "PENDING";
      playerQuery.accountStatus = "PENDING";
    } else if (params.filter === "ACTIVE") {
      coachQuery.accountStatus = "ACTIVE";
      playerQuery.accountStatus = "ACTIVE";
    }
  }

  const [coaches, players] = await Promise.all([
    params.userType === "PLAYER"
      ? []
      : Coach.find(coachQuery)
          .sort({ createdAt: -1 })
          .populate("academyId", "name academyCode slug")
          .populate("userId", "name email status createdAt")
          .lean(),
    params.userType === "COACH"
      ? []
      : Player.find(playerQuery)
          .sort({ createdAt: -1 })
          .populate("academyId", "name academyCode slug")
          .populate("coachId", "coachCode sport")
          .lean(),
  ]);

  const items = [
    ...coaches.map((c) => {
      const user = c.userId as unknown as { name?: string; email?: string; status?: string; createdAt?: Date } | null;
      const academy = c.academyId as unknown as { name?: string; academyCode?: string; slug?: string } | null;
      return {
        id: c._id.toString(),
        type: "COACH",
        code: c.coachCode || "PENDING",
        name: user?.name || "Pending Registration",
        email: user?.email || "",
        sport: c.sport,
        accountStatus: c.accountStatus,
        academyName: academy?.name || "Unknown",
        academyCode: academy?.academyCode || "",
        createdAt: c.createdAt.toISOString(),
        activatedAt: c.activatedAt?.toISOString() || null,
      };
    }),
    ...players.map((p) => {
      const academy = p.academyId as unknown as { name?: string; academyCode?: string; slug?: string } | null;
      return {
        id: p._id.toString(),
        type: "PLAYER",
        code: p.playerCode,
        name: p.name,
        email: p.contact?.email || "",
        sport: p.sport,
        accountStatus: p.accountStatus,
        academyName: academy?.name || "Unknown",
        academyCode: academy?.academyCode || "",
        createdAt: p.createdAt.toISOString(),
        activatedAt: p.activatedAt?.toISOString() || null,
      };
    }),
  ];

  // Sort unified items by createdAt desc
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const paginatedItems = items.slice(skip, skip + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

/**
 * Returns global match records.
 */
export async function getGlobalMatches(params: {
  search?: string;
  sport?: string;
  result?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 15));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.sport && params.sport !== "ALL") {
    query.sport = params.sport;
  }

  if (params.result && params.result !== "ALL") {
    query.result = params.result;
  }

  if (params.search && params.search.trim()) {
    query.opponentName = { $regex: params.search.trim(), $options: "i" };
  }

  const [total, matches] = await Promise.all([
    Match.countDocuments(query),
    Match.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate("academyId", "name slug")
      .populate("coachId", "coachCode sport")
      .lean(),
  ]);

  return {
    items: matches.map((m) => {
      const academy = m.academyId as unknown as { name?: string; slug?: string } | null;
      const coach = m.coachId as unknown as { coachCode?: string; sport?: string } | null;
      return {
        id: m._id.toString(),
        academyName: academy?.name || "Unknown",
        coachCode: coach?.coachCode || "Coach",
        sport: m.sport,
        opponentName: m.opponentName,
        venue: m.venue || "",
        date: m.date.toISOString(),
        score: `${m.academyTeamScore} - ${m.opponentScore}`,
        scoreLabel: m.scoreLabel,
        result: m.result,
        notes: m.notes || "",
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Complaints and reports management.
 */
export async function getComplaints(params: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 15));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.status && params.status !== "ALL") {
    query.status = params.status;
  }

  if (params.category && params.category !== "ALL") {
    query.category = params.category;
  }

  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(query),
    Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("reporterId", "name email role")
      .populate("academyId", "name slug")
      .populate("assignedAdminId", "name email")
      .lean(),
  ]);

  return {
    items: complaints.map((c) => ({
      id: c._id.toString(),
      subject: c.subject,
      category: c.category,
      targetType: c.targetType,
      targetId: c.targetId,
      targetName: c.targetName || "",
      description: c.description,
      status: c.status,
      internalNotes: c.internalNotes || "",
      resolutionNotes: c.resolutionNotes || "",
      reporter: c.reporterId,
      academy: c.academyId,
      assignedAdmin: c.assignedAdminId,
      createdAt: c.createdAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Updates a complaint's status and investigation notes.
 */
export async function updateComplaintStatus(params: {
  complaintId: string;
  status: "OPEN" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "REJECTED";
  internalNotes?: string;
  resolutionNotes?: string;
  assignedAdminId?: string;
  adminId: string;
}) {
  const complaint = await Complaint.findById(params.complaintId);
  if (!complaint) {
    throw new NotFoundError("Complaint record not found");
  }

  complaint.status = params.status;
  if (params.internalNotes !== undefined) complaint.internalNotes = params.internalNotes;
  if (params.resolutionNotes !== undefined) complaint.resolutionNotes = params.resolutionNotes;
  if (params.assignedAdminId) complaint.assignedAdminId = new mongoose.Types.ObjectId(params.assignedAdminId);

  if (params.status === "RESOLVED" || params.status === "REJECTED") {
    complaint.resolvedAt = new Date();
  }

  await complaint.save();

  await AuditLog.create({
    actorId: new mongoose.Types.ObjectId(params.adminId),
    action: `COMPLAINT_STATUS_${params.status}`,
    resourceType: "COMPLAINT",
    resourceId: params.complaintId,
    reason: params.resolutionNotes || params.internalNotes || `Complaint updated to ${params.status}`,
    status: "SUCCESS",
  });

  return {
    success: true,
    complaintId: params.complaintId,
    status: params.status,
  };
}

/**
 * Platform settings & supported sports.
 */
export async function getPlatformSettings() {
  const defaultSports = [
    { code: "FOOTBALL", name: "Football (Soccer)", active: true, defaultScoreLabel: "Goals" },
    { code: "BASKETBALL", name: "Basketball", active: true, defaultScoreLabel: "Points" },
    { code: "CRICKET", name: "Cricket", active: true, defaultScoreLabel: "Runs/Wickets" },
    { code: "TENNIS", name: "Tennis", active: true, defaultScoreLabel: "Sets" },
    { code: "ATHLETICS", name: "Track & Field", active: true, defaultScoreLabel: "Time/Distance" },
  ];

  const defaultControls = {
    allowAcademyRegistration: true,
    allowCoachRegistration: true,
    allowPlayerRegistration: true,
    requireApproval: false,
    maintenanceMode: false,
    maintenanceMessage: "ATHLIX is currently undergoing scheduled platform maintenance. Please check back shortly.",
  };

  const [sportsDoc, controlsDoc] = await Promise.all([
    PlatformSetting.findOne({ key: "supported_sports" }).lean(),
    PlatformSetting.findOne({ key: "platform_controls" }).lean(),
  ]);

  return {
    sports: (sportsDoc?.value as any)?.sports || defaultSports,
    controls: (controlsDoc?.value as any)?.controls || defaultControls,
  };
}

export async function updatePlatformSettings(data: {
  sports?: Array<{ code: string; name: string; active: boolean; defaultScoreLabel: string }>;
  controls?: Record<string, unknown>;
  adminId: string;
}) {
  if (data.sports) {
    await PlatformSetting.findOneAndUpdate(
      { key: "supported_sports" },
      { $set: { value: { sports: data.sports }, updatedBy: new mongoose.Types.ObjectId(data.adminId) } },
      { upsert: true, new: true }
    );
  }

  if (data.controls) {
    await PlatformSetting.findOneAndUpdate(
      { key: "platform_controls" },
      { $set: { value: { controls: data.controls }, updatedBy: new mongoose.Types.ObjectId(data.adminId) } },
      { upsert: true, new: true }
    );
  }

  await AuditLog.create({
    actorId: new mongoose.Types.ObjectId(data.adminId),
    action: "UPDATE_PLATFORM_SETTINGS",
    resourceType: "PLATFORM_CONFIG",
    status: "SUCCESS",
    details: { hasSportsUpdate: !!data.sports, hasControlsUpdate: !!data.controls },
  });

  return { success: true, message: "Platform configuration updated successfully." };
}

/**
 * Announcements & broadcast communication.
 */
export async function getAnnouncements() {
  const announcements = await Announcement.find()
    .sort({ createdAt: -1 })
    .populate("createdBy", "name role")
    .lean();

  return announcements.map((a) => ({
    id: a._id.toString(),
    title: a.title,
    content: a.content,
    category: a.category,
    priority: a.priority,
    targetAudience: a.targetAudience,
    active: a.active,
    creator: a.createdBy,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function createAnnouncement(data: {
  title: string;
  content: string;
  category: "GENERAL" | "MAINTENANCE" | "FEATURE" | "ALERT";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  targetAudience: "ALL" | "ACADEMY_OWNERS" | "COACHES" | "PLAYERS" | "SCOUTS";
  adminId: string;
}) {
  const announcement = await Announcement.create({
    title: data.title.trim(),
    content: data.content.trim(),
    category: data.category,
    priority: data.priority,
    targetAudience: data.targetAudience,
    createdBy: new mongoose.Types.ObjectId(data.adminId),
    active: true,
  });

  await AuditLog.create({
    actorId: new mongoose.Types.ObjectId(data.adminId),
    action: "BROADCAST_ANNOUNCEMENT",
    resourceType: "ANNOUNCEMENT",
    resourceId: announcement._id.toString(),
    reason: data.title,
    status: "SUCCESS",
  });

  return { success: true, announcement };
}

/**
 * Audit logs query with server-side pagination and filters.
 */
export async function getAuditLogs(params: {
  action?: string;
  resourceType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (params.action && params.action !== "ALL") {
    query.action = { $regex: params.action, $options: "i" };
  }

  if (params.resourceType && params.resourceType !== "ALL") {
    query.resourceType = params.resourceType;
  }

  if (params.search && params.search.trim()) {
    query.$or = [
      { action: { $regex: params.search.trim(), $options: "i" } },
      { reason: { $regex: params.search.trim(), $options: "i" } },
      { resourceId: { $regex: params.search.trim(), $options: "i" } },
    ];
  }

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", "name email role")
      .populate("academyId", "name")
      .lean(),
  ]);

  return {
    items: logs.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId || "",
      reason: l.reason || "",
      status: l.status || "SUCCESS",
      details: l.details || {},
      actor: l.actorId,
      actorRole: l.actorRole,
      academy: l.academyId,
      createdAt: l.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
