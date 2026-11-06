import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole, resolveUserSport } from "@/lib/permissions/auth-guard";
import { getScoutTalentDirectory } from "@/modules/eligibility/eligibility-service";
import { Scout } from "@/models";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["SCOUT", "ACADEMY_OWNER", "PLATFORM_ADMIN"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, eligiblePlayers: [] });
    }

    const { searchParams } = new URL(req.url);
    const requestedSport = searchParams.get("sport") || undefined;
    const search = searchParams.get("search") || undefined;

    let targetCoachId = searchParams.get("coachId") || undefined;
    let effectiveSport = requestedSport;

    if (session.role === "SCOUT") {
      // Find the scout's assigned coach
      const scoutRecord = await Scout.findOne({
        userId: session.userId,
        academyId,
      }).populate("assignedCoachId", "sport");

      if (!scoutRecord || !scoutRecord.assignedCoachId) {
        return NextResponse.json({
          success: true,
          message: "No assigned coach found for this scout profile.",
          eligiblePlayers: [],
        });
      }

      targetCoachId = (scoutRecord.assignedCoachId as any)._id?.toString() || scoutRecord.assignedCoachId.toString();

      const scoutSport = await resolveUserSport(session);
      if (
        requestedSport &&
        scoutSport &&
        requestedSport !== "ALL" &&
        requestedSport.trim().toLowerCase() !== scoutSport.trim().toLowerCase()
      ) {
        throw new ForbiddenError(
          `Access denied: You are assigned to ${scoutSport} and cannot view talent in ${requestedSport}.`
        );
      }

      effectiveSport = scoutSport || requestedSport;
    }

    if (!targetCoachId) {
      return NextResponse.json({
        success: true,
        eligiblePlayers: [],
      });
    }

    // Fetches ONLY players with status === 'READY' under the assigned coach and assigned sport!
    const eligiblePlayers = await getScoutTalentDirectory(academyId, targetCoachId, {
      sport: effectiveSport,
      search,
    });

    return NextResponse.json({
      success: true,
      sport: effectiveSport,
      eligiblePlayers,
      totalReadyCount: eligiblePlayers.length,
      assignedCoachId: targetCoachId,
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
