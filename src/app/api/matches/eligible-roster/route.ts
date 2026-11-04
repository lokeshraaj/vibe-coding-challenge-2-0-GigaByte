import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { getEligibleMatchRoster } from "@/modules/matches/match-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER"], req);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId query parameter required" }, { status: 400 });
    }

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    await connectToDatabase();
    const roster = await getEligibleMatchRoster(academyId, sessionId);

    return NextResponse.json({ success: true, eligiblePlayers: roster });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
