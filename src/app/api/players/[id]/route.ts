import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth, resolveUserSport } from "@/lib/permissions/auth-guard";
import { getPlayerById, updatePlayer } from "@/modules/players/player-service";
import { calculatePlayerEligibilityFromDb } from "@/modules/eligibility/eligibility-service";
import { MatchParticipant, Attendance, Scout } from "@/models";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id: playerId } = await params;
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const player = await getPlayerById(academyId, playerId);

    // Permission rules:
    // 1. Coach can only view their assigned player within their assigned sport
    if (session.role === "COACH") {
      if (player.coachId._id.toString() !== session.coachId) {
        throw new ForbiddenError("Unauthorized: You can only view players assigned to your coaching roster.");
      }
      const coachSport = await resolveUserSport(session);
      if (coachSport && player.sport.trim().toLowerCase() !== coachSport.trim().toLowerCase()) {
        throw new ForbiddenError(
          `Access denied: You are assigned to ${coachSport} and cannot access ${player.sport} player profiles.`
        );
      }
    }

    // 2. Player can only view their own record
    if (session.role === "PLAYER") {
      const isSelf =
        (session.playerId && session.playerId === player._id.toString()) ||
        (player.userId && player.userId.toString() === session.userId);

      if (!isSelf) {
        throw new ForbiddenError("Unauthorized: Players can only view their personal records.");
      }
    }

    // Real-time calculation from actual database records!
    const eligibility = await calculatePlayerEligibilityFromDb(academyId, playerId);

    // 3. Scout can only view their assigned coach's players, AND only if trial-ready (READY), AND only in their assigned sport!
    if (session.role === "SCOUT") {
      let targetCoachId = session.coachId;
      if (!targetCoachId) {
        const scoutRecord = await Scout.findOne({
          userId: session.userId,
          academyId,
        });
        if (scoutRecord && scoutRecord.assignedCoachId) {
          targetCoachId = scoutRecord.assignedCoachId.toString();
        }
      }

      if (!targetCoachId || player.coachId._id.toString() !== targetCoachId) {
        throw new ForbiddenError("Unauthorized: Scouts can only view athletes under their assigned coach.");
      }

      const scoutSport = await resolveUserSport(session);
      if (scoutSport && player.sport.trim().toLowerCase() !== scoutSport.trim().toLowerCase()) {
        throw new ForbiddenError(
          `Access denied: You are assigned to ${scoutSport} and cannot view ${player.sport} athletes.`
        );
      }

      if (eligibility.status !== "READY") {
        throw new ForbiddenError("Access restricted: Scouts can strictly only view trial-ready (READY) athletes.");
      }
    }

    // Fetch match participation history
    const matchHistory = await MatchParticipant.find({
      academyId: player.academyId,
      playerId: player._id,
    })
      .populate("matchId", "date sport opponentName result venue scoreLabel")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Fetch recent attendance history
    const attendanceHistory = await Attendance.find({
      academyId: player.academyId,
      playerId: player._id,
    })
      .populate("sessionId", "date sport title status")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    return NextResponse.json({
      success: true,
      player: {
        id: player._id.toString(),
        playerCode: player.playerCode,
        name: player.name,
        dateOfBirth: player.dateOfBirth.toISOString(),
        gender: player.gender,
        sport: player.sport,
        position: player.position,
        photoUrl: player.photoUrl,
        enrollmentDate: player.enrollmentDate.toISOString(),
        contact: player.contact,
        status: player.status,
        coachId: player.coachId._id.toString(),
        coachName: (player.coachId as unknown as { userId: { name: string } })?.userId?.name || "Coach",
      },
      eligibility,
      matchHistory: matchHistory.map((m) => {
        const matchDoc = m.matchId as unknown as {
          _id: string;
          date: Date;
          sport: string;
          opponentName: string;
          result: string;
          venue: string;
          scoreLabel: string;
        };
        return {
          id: m._id.toString(),
          date: matchDoc ? matchDoc.date.toISOString() : "",
          opponentName: matchDoc?.opponentName || "Opponent",
          sport: matchDoc?.sport || player.sport,
          scoreLabel: matchDoc?.scoreLabel || "Score",
          score: m.score,
          minutesPlayed: m.minutesPlayed,
          result: matchDoc?.result || "N/A",
          performanceNotes: m.performanceNotes,
        };
      }),
      attendanceHistory: attendanceHistory.map((a) => {
        const sess = a.sessionId as unknown as {
          _id: string;
          date: Date;
          sport: string;
          title: string;
        };
        return {
          id: a._id.toString(),
          date: sess ? sess.date.toISOString() : "",
          sessionTitle: sess?.title || "Practice",
          sport: sess?.sport || player.sport,
          status: a.status,
          notes: a.notes,
        };
      }),
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id: playerId } = await params;
    await connectToDatabase();

    if (session.role !== "COACH" && session.role !== "ACADEMY_OWNER" && session.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenError("Unauthorized to modify player records.");
    }

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const coachSport = session.role === "COACH" ? await resolveUserSport(session) : undefined;
    const body = await req.json();

    const updated = await updatePlayer(
      academyId,
      playerId,
      body,
      session.role === "COACH" ? session.coachId : undefined,
      coachSport
    );

    return NextResponse.json({ success: true, player: updated });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
