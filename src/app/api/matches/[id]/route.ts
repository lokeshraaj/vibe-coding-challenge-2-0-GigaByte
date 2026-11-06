import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth, resolveUserSport } from "@/lib/permissions/auth-guard";
import { getMatchDetails } from "@/modules/matches/match-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { Scout, MatchParticipant } from "@/models";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id: matchId } = await params;
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    let filterCoachId: string | null = null;
    let filterSport: string | null = null;

    if (session.role === "COACH") {
      filterCoachId = session.coachId || null;
      filterSport = await resolveUserSport(session);
    } else if (session.role === "SCOUT") {
      filterSport = await resolveUserSport(session);
      const scoutRecord = await Scout.findOne({ userId: session.userId, academyId });
      filterCoachId = scoutRecord?.assignedCoachId?.toString() || null;
    }

    const details = await getMatchDetails(academyId, matchId, filterCoachId, filterSport);

    // If role is PLAYER, verify that player is a participant in this match
    if (session.role === "PLAYER") {
      const isParticipant = details.participants.some(
        (p) => p.playerId === session.playerId || p.playerId === session.userId
      );
      if (!isParticipant) {
        throw new ForbiddenError("Access denied: You can only view matches you participated in.");
      }
    }

    return NextResponse.json({ success: true, ...details });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
