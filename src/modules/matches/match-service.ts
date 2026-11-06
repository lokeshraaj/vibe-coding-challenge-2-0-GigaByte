import mongoose from "mongoose";
import { Match, MatchParticipant, PracticeSession, Attendance, Player } from "@/models";
import { getSportScoreLabel } from "@/lib/utils";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";

export interface CreateMatchInput {
  academyId: string;
  coachId: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  sport: string;
  opponentName: string;
  venue?: string;
  scoreLabel?: string;
  academyTeamScore: number;
  opponentScore: number;
  result?: "WON" | "LOST" | "DRAW" | "ABANDONED";
  notes?: string;
  participants: Array<{
    playerId: string;
    score: number;
    minutesPlayed?: number;
    performanceNotes?: string;
  }>;
}

export async function createMatch(input: CreateMatchInput, coachSport?: string | null) {
  // Enforce sport-level access control if coach has an assigned sport
  if (coachSport && input.sport.trim().toLowerCase() !== coachSport.trim().toLowerCase()) {
    throw new ForbiddenError(
      `Access denied: You are assigned to ${coachSport} and cannot create matches for ${input.sport}.`
    );
  }

  const effectiveSport = coachSport ? coachSport.trim() : input.sport.trim();

  // 1. Verify linked session exists, is CLOSED, belongs to coach & sport
  const sessionQuery: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(input.sessionId),
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
  };

  if (coachSport) {
    sessionQuery.sport = new RegExp(`^${coachSport.trim()}$`, "i");
  }

  const session = await PracticeSession.findOne(sessionQuery);

  if (!session) {
    throw new NotFoundError("Linked practice session not found or does not belong to this coach/sport.");
  }

  if (session.status !== "CLOSED") {
    throw new ValidationError(
      "Cannot schedule or record match: Linked practice session must be CLOSED and locked first."
    );
  }

  // Check sport match
  if (session.sport.trim().toLowerCase() !== effectiveSport.toLowerCase()) {
    throw new ValidationError(
      `Linked session sport (${session.sport}) does not match match sport (${effectiveSport}).`
    );
  }

  // 2. Fetch all attendance records for this session
  const attendanceList = await Attendance.find({
    sessionId: session._id,
  }).populate("playerId", "name playerCode");

  const presentPlayerMap = new Map<string, string>(); // id -> name
  const absentPlayerMap = new Map<string, string>(); // id -> name

  for (const att of attendanceList) {
    const pId = att.playerId._id.toString();
    const pName = (att.playerId as unknown as { name: string }).name;
    if (att.status === "PRESENT") {
      presentPlayerMap.set(pId, pName);
    } else {
      absentPlayerMap.set(pId, pName);
    }
  }

  // 3. Strict Invariant Verification: Reject any participant not marked PRESENT
  for (const participant of input.participants) {
    const pId = participant.playerId;
    if (absentPlayerMap.has(pId)) {
      const playerName = absentPlayerMap.get(pId);
      throw new ValidationError(
        `Violation: Player '${playerName}' was marked ABSENT in session '${session.title || "Practice"}' and is strictly forbidden from participating in this match.`
      );
    }

    if (!presentPlayerMap.has(pId)) {
      throw new ValidationError(
        `Violation: Player ID '${pId}' has no PRESENT record for session '${session.title || "Practice"}' on ${input.date}.`
      );
    }
  }

  const normalizedDate = new Date(input.date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  const matchId = new mongoose.Types.ObjectId();
  const label = input.scoreLabel || getSportScoreLabel(effectiveSport);

  // Compute result if not explicitly passed
  let computedResult = input.result;
  if (!computedResult) {
    if (input.academyTeamScore > input.opponentScore) computedResult = "WON";
    else if (input.academyTeamScore < input.opponentScore) computedResult = "LOST";
    else computedResult = "DRAW";
  }

  const match = await Match.create({
    _id: matchId,
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
    sessionId: session._id,
    date: normalizedDate,
    sport: effectiveSport,
    opponentName: input.opponentName.trim(),
    venue: input.venue || "",
    scoreLabel: label,
    academyTeamScore: input.academyTeamScore,
    opponentScore: input.opponentScore,
    result: computedResult,
    notes: input.notes || "",
  });

  // Save participants
  const participantDocs = input.participants.map((p) => ({
    academyId: match.academyId,
    matchId: match._id,
    playerId: new mongoose.Types.ObjectId(p.playerId),
    score: p.score,
    minutesPlayed: p.minutesPlayed || 0,
    performanceNotes: p.performanceNotes || "",
  }));

  if (participantDocs.length > 0) {
    await MatchParticipant.insertMany(participantDocs);
  }

  return {
    id: match._id.toString(),
    opponentName: match.opponentName,
    sport: match.sport,
    academyTeamScore: match.academyTeamScore,
    opponentScore: match.opponentScore,
    result: match.result,
    participantsCount: participantDocs.length,
  };
}

export async function listMatchesByCoach(
  academyId: string,
  coachId: string,
  sport?: string | null
) {
  const query: Record<string, unknown> = {
    academyId: new mongoose.Types.ObjectId(academyId),
    coachId: new mongoose.Types.ObjectId(coachId),
  };

  if (sport) {
    query.sport = new RegExp(`^${sport.trim()}$`, "i");
  }

  const matches = await Match.find(query)
    .sort({ date: -1 })
    .lean();

  return Promise.all(
    matches.map(async (m) => {
      const participants = await MatchParticipant.find({ matchId: m._id })
        .populate("playerId", "name playerCode position")
        .lean();

      return {
        id: m._id.toString(),
        date: m.date.toISOString(),
        sport: m.sport,
        opponentName: m.opponentName,
        venue: m.venue,
        scoreLabel: m.scoreLabel,
        academyTeamScore: m.academyTeamScore,
        opponentScore: m.opponentScore,
        result: m.result,
        notes: m.notes,
        participantsCount: participants.length,
        topScorers: participants
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((p) => {
            const player = p.playerId as unknown as { name: string; playerCode: string };
            return {
              name: player?.name || "Player",
              score: p.score,
            };
          }),
      };
    })
  );
}

export async function getMatchDetails(
  academyId: string,
  matchId: string,
  coachId?: string | null,
  sport?: string | null
) {
  const query: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(matchId),
    academyId: new mongoose.Types.ObjectId(academyId),
  };

  if (coachId) {
    query.coachId = new mongoose.Types.ObjectId(coachId);
  }

  if (sport) {
    query.sport = new RegExp(`^${sport.trim()}$`, "i");
  }

  const match = await Match.findOne(query).populate("coachId", "sport");

  if (!match) {
    const existing = await Match.findOne({
      _id: new mongoose.Types.ObjectId(matchId),
      academyId: new mongoose.Types.ObjectId(academyId),
    });
    if (existing) {
      throw new ForbiddenError("Access denied: You are not authorized to view matches outside your assigned sport or squad.");
    }
    throw new NotFoundError("Match not found");
  }

  const participants = await MatchParticipant.find({ matchId: match._id })
    .populate("playerId", "name playerCode position photoUrl")
    .lean();

  return {
    match: {
      id: match._id.toString(),
      coachId: match.coachId._id.toString(),
      date: match.date.toISOString(),
      sport: match.sport,
      opponentName: match.opponentName,
      venue: match.venue,
      scoreLabel: match.scoreLabel,
      academyTeamScore: match.academyTeamScore,
      opponentScore: match.opponentScore,
      result: match.result,
      notes: match.notes,
    },
    participants: participants.map((p) => {
      const pl = p.playerId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        playerCode: string;
        position: string;
        photoUrl?: string;
      };
      return {
        playerId: pl._id.toString(),
        name: pl.name,
        playerCode: pl.playerCode,
        position: pl.position,
        photoUrl: pl.photoUrl,
        score: p.score,
        minutesPlayed: p.minutesPlayed,
        performanceNotes: p.performanceNotes,
      };
    }),
  };
}

/**
 * Retrieves eligible roster for a match:
 * ONLY players marked PRESENT in the given closed practice session!
 */
export async function getEligibleMatchRoster(
  academyId: string,
  sessionId: string,
  coachId?: string | null,
  sport?: string | null
) {
  const query: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(sessionId),
    academyId: new mongoose.Types.ObjectId(academyId),
  };

  if (coachId) {
    query.coachId = new mongoose.Types.ObjectId(coachId);
  }

  if (sport) {
    query.sport = new RegExp(`^${sport.trim()}$`, "i");
  }

  const session = await PracticeSession.findOne(query);

  if (!session) {
    const existing = await PracticeSession.findOne({
      _id: new mongoose.Types.ObjectId(sessionId),
      academyId: new mongoose.Types.ObjectId(academyId),
    });
    if (existing) {
      throw new ForbiddenError("Access denied: Practice session belongs to another coach or sport.");
    }
    throw new NotFoundError("Session not found");
  }

  if (session.status !== "CLOSED") {
    throw new ValidationError("Cannot fetch match roster: Session must be CLOSED first.");
  }

  const presentRecords = await Attendance.find({
    sessionId: session._id,
    status: "PRESENT",
  }).populate("playerId", "name playerCode position sport");

  return presentRecords.map((r) => {
    const pl = r.playerId as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      playerCode: string;
      position: string;
      sport: string;
    };
    return {
      playerId: pl._id.toString(),
      name: pl.name,
      playerCode: pl.playerCode,
      position: pl.position,
      sport: pl.sport,
    };
  });
}
