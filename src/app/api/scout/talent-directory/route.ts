import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
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
    const sport = searchParams.get("sport") || undefined;
    const search = searchParams.get("search") || undefined;

    let targetCoachId = searchParams.get("coachId") || undefined;

    if (session.role === "SCOUT") {
      // Find the scout's assigned coach
      const scoutRecord = await Scout.findOne({
        userId: session.userId,
        academyId,
      });

      if (!scoutRecord || !scoutRecord.assignedCoachId) {
        return NextResponse.json({
          success: true,
          message: "No assigned coach found for this scout profile.",
          eligiblePlayers: [],
        });
      }

      targetCoachId = scoutRecord.assignedCoachId.toString();
    }

    if (!targetCoachId) {
      return NextResponse.json({
        success: true,
        eligiblePlayers: [],
      });
    }

    // Fetches ONLY players with status === 'READY' under the assigned coach!
    const eligiblePlayers = await getScoutTalentDirectory(academyId, targetCoachId, {
      sport,
      search,
    });

    return NextResponse.json({
      success: true,
      eligiblePlayers,
      totalReadyCount: eligiblePlayers.length,
      assignedCoachId: targetCoachId,
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
