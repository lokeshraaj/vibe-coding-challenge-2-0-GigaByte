import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth, resolveUserSport } from "@/lib/permissions/auth-guard";
import {
  Academy,
  User,
  Coach,
  Scout,
  Player,
  PracticeSession,
  Attendance,
  Match,
  MatchParticipant,
} from "@/models";
import {
  getCoachEligibilityOverview,
  getAcademyEligibilityOverview,
  calculatePlayerEligibilityFromDb,
} from "@/modules/eligibility/eligibility-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const role = session.role;
    const academyId = session.academyId;

    // 1. PLATFORM SUPER ADMIN
    if (role === "PLATFORM_ADMIN" || role === "SUPER_ADMIN") {
      const [
        totalAcademies,
        activeAcademies,
        totalCoaches,
        totalPlayers,
        totalMatches,
      ] = await Promise.all([
        Academy.countDocuments(),
        Academy.countDocuments({ status: "ACTIVE" }),
        Coach.countDocuments({ status: "ACTIVE" }),
        Player.countDocuments({ status: "ACTIVE" }),
        Match.countDocuments(),
      ]);

      const recentAcademies = await Academy.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "name email")
        .lean();

      return NextResponse.json({
        success: true,
        role,
        stats: {
          totalAcademies,
          activeAcademies,
          totalCoaches,
          totalPlayers,
          totalMatches,
          recentAcademies: recentAcademies.map((a) => ({
            id: a._id.toString(),
            name: a.name,
            slug: a.slug,
            city: a.location?.city,
            country: a.location?.country,
            status: a.status,
            ownerName: (a.ownerId as unknown as { name: string })?.name || "Owner",
            createdAt: a.createdAt.toISOString(),
          })),
        },
      });
    }

    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    // 2. ACADEMY OWNER (Full multi-sport visibility across academy)
    if (role === "ACADEMY_OWNER") {
      const [
        totalCoaches,
        totalPlayers,
        totalSessions,
        totalMatches,
        coachesList,
        eligibilityOverview,
      ] = await Promise.all([
        Coach.countDocuments({ academyId, status: "ACTIVE" }),
        Player.countDocuments({ academyId, status: "ACTIVE" }),
        PracticeSession.countDocuments({ academyId }),
        Match.countDocuments({ academyId }),
        Coach.find({ academyId }).populate("userId", "name email").lean(),
        getAcademyEligibilityOverview(academyId),
      ]);

      // Sport distribution
      const sportAgg = await Player.aggregate([
        { $match: { academyId: new (require("mongoose").Types.ObjectId)(academyId), status: "ACTIVE" } },
        { $group: { _id: "$sport", count: { $sum: 1 } } },
      ]);

      const sportDistribution = sportAgg.map((s) => ({ sport: s._id, count: s.count }));

      return NextResponse.json({
        success: true,
        role,
        stats: {
          totalCoaches,
          totalPlayers,
          totalSessions,
          totalMatches,
          readyPlayers: eligibilityOverview.readyCount,
          notReadyPlayers: eligibilityOverview.notReadyCount,
          sportDistribution,
          coaches: coachesList.map((c) => ({
            id: c._id.toString(),
            name: (c.userId as unknown as { name: string })?.name || "Coach",
            sport: c.sport,
            experienceYears: c.experienceYears,
          })),
        },
      });
    }

    // 3. COACH DASHBOARD (Strict Sport-Based Data Isolation)
    if (role === "COACH") {
      const coachId = session.coachId;
      if (!coachId) {
        return NextResponse.json({ success: false, error: "Coach profile missing" }, { status: 400 });
      }

      const coachSport = await resolveUserSport(session);
      const sportFilter = coachSport ? { sport: new RegExp(`^${coachSport.trim()}$`, "i") } : {};

      const [
        assignedPlayersCount,
        recentSessions,
        recentMatches,
        eligibilityData,
      ] = await Promise.all([
        Player.countDocuments({ academyId, coachId, status: "ACTIVE", ...sportFilter }),
        PracticeSession.find({ academyId, coachId, ...sportFilter }).sort({ date: -1 }).limit(5).lean(),
        Match.find({ academyId, coachId, ...sportFilter }).sort({ date: -1 }).limit(5).lean(),
        getCoachEligibilityOverview(academyId, coachId, coachSport),
      ]);

      return NextResponse.json({
        success: true,
        role,
        sport: coachSport,
        stats: {
          assignedSport: coachSport,
          assignedPlayersCount,
          readyCount: eligibilityData.readyCount,
          notReadyCount: eligibilityData.notReadyCount,
          recentSessions: recentSessions.map((s) => ({
            id: s._id.toString(),
            sport: s.sport,
            date: s.date.toISOString(),
            title: s.title,
            status: s.status,
          })),
          recentMatches: recentMatches.map((m) => ({
            id: m._id.toString(),
            sport: m.sport,
            opponentName: m.opponentName,
            result: m.result,
            date: m.date.toISOString(),
            score: `${m.academyTeamScore} - ${m.opponentScore}`,
          })),
          rosterEligibility: eligibilityData.players,
        },
      });
    }

    // 4. SCOUT DASHBOARD (Strict Sport-Based Data Isolation & READY gate)
    if (role === "SCOUT") {
      const scoutRecord = await Scout.findOne({ userId: session.userId, academyId })
        .populate({
          path: "assignedCoachId",
          populate: { path: "userId", select: "name email" },
        })
        .lean();

      if (!scoutRecord || !scoutRecord.assignedCoachId) {
        return NextResponse.json({
          success: true,
          role,
          stats: {
            assignedCoach: null,
            totalReadyPlayers: 0,
            players: [],
          },
        });
      }

      const coachDoc = scoutRecord.assignedCoachId as unknown as {
        _id: { toString(): string };
        sport: string;
        userId: { name: string };
      };

      const scoutSport = scoutRecord.sport || coachDoc.sport;
      const eligibility = await getCoachEligibilityOverview(academyId, coachDoc._id.toString(), scoutSport);
      const readyPlayers = eligibility.players.filter((p) => p.status === "READY");

      return NextResponse.json({
        success: true,
        role,
        sport: scoutSport,
        stats: {
          assignedSport: scoutSport,
          assignedCoach: {
            id: coachDoc._id.toString(),
            name: coachDoc.userId?.name || "Coach",
            sport: coachDoc.sport,
          },
          totalReadyPlayers: readyPlayers.length,
          readyPlayers,
        },
      });
    }

    // 5. PLAYER DASHBOARD
    if (role === "PLAYER") {
      let playerId = session.playerId;
      if (!playerId) {
        const pDoc = await Player.findOne({ userId: session.userId, academyId });
        if (pDoc) playerId = pDoc._id.toString();
      }

      if (!playerId) {
        return NextResponse.json({ success: false, error: "Player record not found" }, { status: 404 });
      }

      const [player, eligibility, matches] = await Promise.all([
        Player.findById(playerId).lean(),
        calculatePlayerEligibilityFromDb(academyId, playerId),
        MatchParticipant.find({ playerId })
          .populate("matchId", "date opponentName sport scoreLabel result")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      return NextResponse.json({
        success: true,
        role,
        sport: player?.sport,
        stats: {
          player: {
            id: player?._id.toString(),
            name: player?.name,
            playerCode: player?.playerCode,
            sport: player?.sport,
            position: player?.position,
          },
          eligibility,
          matches: matches.map((m) => {
            const matchDoc = m.matchId as unknown as {
              date: Date;
              opponentName: string;
              sport: string;
              scoreLabel: string;
              result: string;
            };
            return {
              id: m._id.toString(),
              date: matchDoc?.date?.toISOString(),
              opponentName: matchDoc?.opponentName,
              score: m.score,
              scoreLabel: matchDoc?.scoreLabel,
              result: matchDoc?.result,
            };
          }),
        },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown role" }, { status: 400 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
