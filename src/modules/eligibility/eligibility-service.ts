import mongoose from "mongoose";
import { Player, PracticeSession, Attendance, MatchParticipant } from "@/models";
import { calculatePlayerEligibility, EligibilityRulesConfig } from "./eligibility-engine";
import { IEligibilityCalculation } from "@/types";
import { NotFoundError } from "@/lib/errors";

export async function calculatePlayerEligibilityFromDb(
  academyId: string,
  playerId: string,
  config?: EligibilityRulesConfig
): Promise<IEligibilityCalculation> {
  const player = await Player.findOne({
    _id: new mongoose.Types.ObjectId(playerId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!player) {
    throw new NotFoundError("Player not found");
  }

  // 1. Count closed sessions for player's coach & sport from player's enrollment date
  const closedSessions = await PracticeSession.find({
    academyId: player.academyId,
    coachId: player.coachId,
    sport: new RegExp(`^${player.sport}$`, "i"),
    status: "CLOSED",
    date: { $gte: player.enrollmentDate },
  }).select("_id");

  const closedSessionIds = closedSessions.map((s) => s._id);
  const totalClosedSessions = closedSessionIds.length;

  // 2. Count present sessions for this player
  let presentSessions = 0;
  if (totalClosedSessions > 0) {
    presentSessions = await Attendance.countDocuments({
      sessionId: { $in: closedSessionIds },
      playerId: player._id,
      status: "PRESENT",
    });
  }

  // 3. Count matches played and total score
  const matchEntries = await MatchParticipant.find({
    academyId: player.academyId,
    playerId: player._id,
  }).select("score");

  const matchesPlayed = matchEntries.length;
  const totalScore = matchEntries.reduce((sum, m) => sum + (m.score || 0), 0);

  return calculatePlayerEligibility(
    {
      playerId: player._id.toString(),
      playerName: player.name,
      sport: player.sport,
      position: player.position,
      enrollmentDate: player.enrollmentDate.toISOString(),
      totalClosedSessions,
      presentSessions,
      matchesPlayed,
      totalScore,
    },
    config
  );
}

/**
 * SCOUT DIRECTORY:
 * Strict Requirement: Scout can ONLY see players who are READY under their assigned coach!
 */
export async function getScoutTalentDirectory(
  academyId: string,
  assignedCoachId: string,
  filter?: { sport?: string; search?: string }
): Promise<IEligibilityCalculation[]> {
  const playerQuery: Record<string, unknown> = {
    academyId: new mongoose.Types.ObjectId(academyId),
    coachId: new mongoose.Types.ObjectId(assignedCoachId),
    status: "ACTIVE",
  };

  if (filter?.sport && filter.sport !== "ALL") {
    playerQuery.sport = new RegExp(`^${filter.sport}$`, "i");
  }

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim();
    playerQuery.$or = [
      { name: { $regex: s, $options: "i" } },
      { position: { $regex: s, $options: "i" } },
      { playerCode: { $regex: s, $options: "i" } },
    ];
  }

  const players = await Player.find(playerQuery);

  const calculations = await Promise.all(
    players.map((p) => calculatePlayerEligibilityFromDb(academyId, p._id.toString()))
  );

  // Strict Scout Gate: Filter out NOT_READY players!
  return calculations.filter((calc) => calc.status === "READY");
}

/**
 * Coach & Owner Eligibility Overview
 */
export async function getCoachEligibilityOverview(academyId: string, coachId: string) {
  const players = await Player.find({
    academyId: new mongoose.Types.ObjectId(academyId),
    coachId: new mongoose.Types.ObjectId(coachId),
    status: "ACTIVE",
  }).sort({ name: 1 });

  const rosterEligibility = await Promise.all(
    players.map((p) => calculatePlayerEligibilityFromDb(academyId, p._id.toString()))
  );

  const readyPlayers = rosterEligibility.filter((p) => p.status === "READY");
  const notReadyPlayers = rosterEligibility.filter((p) => p.status === "NOT_READY");

  return {
    totalPlayers: players.length,
    readyCount: readyPlayers.length,
    notReadyCount: notReadyPlayers.length,
    players: rosterEligibility,
  };
}

export async function getAcademyEligibilityOverview(academyId: string) {
  const players = await Player.find({
    academyId: new mongoose.Types.ObjectId(academyId),
    status: "ACTIVE",
  });

  const rosterEligibility = await Promise.all(
    players.map((p) => calculatePlayerEligibilityFromDb(academyId, p._id.toString()))
  );

  const readyCount = rosterEligibility.filter((p) => p.status === "READY").length;
  const notReadyCount = rosterEligibility.filter((p) => p.status === "NOT_READY").length;

  return {
    totalPlayers: players.length,
    readyCount,
    notReadyCount,
  };
}
