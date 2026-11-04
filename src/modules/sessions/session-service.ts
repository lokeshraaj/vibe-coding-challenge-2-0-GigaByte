import mongoose from "mongoose";
import { PracticeSession, Attendance, Player } from "@/models";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";

export interface CreateSessionInput {
  academyId: string;
  coachId: string;
  sport: string;
  date: string; // YYYY-MM-DD
  title?: string;
  timeSlot?: {
    startTime: string;
    endTime: string;
  };
}

export interface SaveAttendanceInput {
  academyId: string;
  coachId: string;
  sessionId: string;
  records: Array<{
    playerId: string;
    status: "PRESENT" | "ABSENT";
    notes?: string;
  }>;
}

export async function createPracticeSession(input: CreateSessionInput) {
  const normalizedDate = new Date(input.date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  // Check for duplicate session for the same coach, sport, and date
  const existing = await PracticeSession.findOne({
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
    sport: new RegExp(`^${input.sport.trim()}$`, "i"),
    date: normalizedDate,
  });

  if (existing) {
    throw new ConflictError(
      `A practice session already exists for this coach, ${input.sport}, on ${input.date}.`
    );
  }

  const session = await PracticeSession.create({
    academyId: new mongoose.Types.ObjectId(input.academyId),
    coachId: new mongoose.Types.ObjectId(input.coachId),
    sport: input.sport.trim(),
    date: normalizedDate,
    title: input.title?.trim() || `${input.sport} Practice Session`,
    timeSlot: input.timeSlot || { startTime: "07:00", endTime: "09:00" },
    status: "OPEN",
  });

  return session;
}

export async function saveAttendance(input: SaveAttendanceInput) {
  const session = await PracticeSession.findOne({
    _id: new mongoose.Types.ObjectId(input.sessionId),
    academyId: new mongoose.Types.ObjectId(input.academyId),
  });

  if (!session) {
    throw new NotFoundError("Practice session not found");
  }

  // Immutable lock enforcement!
  if (session.status === "CLOSED") {
    throw new ForbiddenError(
      "Cannot modify attendance: This practice session is CLOSED and locked for audit integrity."
    );
  }

  // Ensure coach ownership
  if (session.coachId.toString() !== input.coachId) {
    throw new ForbiddenError("Unauthorized: Coaches can only save attendance for their own sessions.");
  }

  const operations = input.records.map((r) => ({
    updateOne: {
      filter: {
        sessionId: session._id,
        playerId: new mongoose.Types.ObjectId(r.playerId),
      },
      update: {
        $set: {
          academyId: session.academyId,
          coachId: session.coachId,
          status: r.status,
          notes: r.notes || "",
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await Attendance.bulkWrite(operations);
  }

  return {
    success: true,
    savedCount: operations.length,
    sessionId: session._id.toString(),
  };
}

export async function closePracticeSession(
  academyId: string,
  coachId: string,
  sessionId: string,
  closedByUserId: string
) {
  const session = await PracticeSession.findOne({
    _id: new mongoose.Types.ObjectId(sessionId),
    academyId: new mongoose.Types.ObjectId(academyId),
  });

  if (!session) {
    throw new NotFoundError("Practice session not found");
  }

  if (session.status === "CLOSED") {
    throw new ConflictError("Session is already closed");
  }

  if (session.coachId.toString() !== coachId) {
    throw new ForbiddenError("Only the session's coach can close this session.");
  }

  // Validate attendance completeness: All active players assigned to coach & sport enrolled before/on session date
  const rosterPlayers = await Player.find({
    academyId: session.academyId,
    coachId: session.coachId,
    sport: new RegExp(`^${session.sport}$`, "i"),
    status: "ACTIVE",
    enrollmentDate: { $lte: session.date },
  }).select("_id name");

  const attendanceRecords = await Attendance.find({
    sessionId: session._id,
  });

  const markedPlayerIds = new Set(attendanceRecords.map((a) => a.playerId.toString()));
  const missingPlayers = rosterPlayers.filter((p) => !markedPlayerIds.has(p._id.toString()));

  if (missingPlayers.length > 0) {
    const missingNames = missingPlayers.slice(0, 3).map((p) => p.name).join(", ");
    throw new ValidationError(
      `Cannot close session: Attendance is incomplete. Missing records for ${missingPlayers.length} player(s): ${missingNames}${
        missingPlayers.length > 3 ? "..." : ""
      }. Mark them PRESENT or ABSENT first.`
    );
  }

  session.status = "CLOSED";
  session.closedAt = new Date();
  session.closedBy = new mongoose.Types.ObjectId(closedByUserId);
  await session.save();

  return session;
}

export async function getSessionDetails(academyId: string, sessionId: string) {
  const session = await PracticeSession.findOne({
    _id: new mongoose.Types.ObjectId(sessionId),
    academyId: new mongoose.Types.ObjectId(academyId),
  }).populate({
    path: "coachId",
    populate: { path: "userId", select: "name email" },
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  // Fetch roster players enrolled up to this session's date
  const rosterPlayers = await Player.find({
    academyId: session.academyId,
    coachId: session.coachId._id,
    sport: new RegExp(`^${session.sport}$`, "i"),
    status: "ACTIVE",
    enrollmentDate: { $lte: session.date },
  }).sort({ name: 1 });

  // Fetch attendance records for this session
  const attendanceRecords = await Attendance.find({
    sessionId: session._id,
  });

  const attendanceMap = new Map(attendanceRecords.map((a) => [a.playerId.toString(), a]));

  const rosterWithAttendance = rosterPlayers.map((p) => {
    const att = attendanceMap.get(p._id.toString());
    return {
      playerId: p._id.toString(),
      playerCode: p.playerCode,
      name: p.name,
      position: p.position,
      status: att ? att.status : null,
      notes: att?.notes || "",
    };
  });

  const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT").length;
  const absentCount = attendanceRecords.filter((a) => a.status === "ABSENT").length;

  return {
    session: {
      id: session._id.toString(),
      coachId: session.coachId._id.toString(),
      sport: session.sport,
      date: session.date.toISOString(),
      title: session.title,
      timeSlot: session.timeSlot,
      status: session.status,
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
    },
    summary: {
      totalRoster: rosterPlayers.length,
      presentCount,
      absentCount,
      unmarkedCount: Math.max(0, rosterPlayers.length - attendanceRecords.length),
    },
    roster: rosterWithAttendance,
  };
}

export async function listSessionsByCoach(academyId: string, coachId: string) {
  const sessions = await PracticeSession.find({
    academyId: new mongoose.Types.ObjectId(academyId),
    coachId: new mongoose.Types.ObjectId(coachId),
  })
    .sort({ date: -1 })
    .lean();

  return Promise.all(
    sessions.map(async (s) => {
      const records = await Attendance.find({ sessionId: s._id });
      const present = records.filter((r) => r.status === "PRESENT").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;

      return {
        id: s._id.toString(),
        sport: s.sport,
        date: s.date.toISOString(),
        title: s.title,
        status: s.status,
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        presentCount: present,
        absentCount: absent,
        totalMarked: records.length,
      };
    })
  );
}
