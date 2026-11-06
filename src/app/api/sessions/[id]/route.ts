import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole, resolveUserSport } from "@/lib/permissions/auth-guard";
import { getSessionDetails } from "@/modules/sessions/session-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER", "PLATFORM_ADMIN"], req);
    const { id: sessionId } = await params;
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    let coachSport: string | undefined = undefined;
    if (session.role === "COACH") {
      const sport = await resolveUserSport(session);
      if (sport) coachSport = sport;
    }

    const details = await getSessionDetails(
      academyId,
      sessionId,
      session.role === "COACH" ? session.coachId : undefined,
      coachSport
    );

    // Enforce coach boundary and sport-level isolation
    if (session.role === "COACH") {
      if (details.session.coachId !== session.coachId) {
        throw new ForbiddenError("Unauthorized: Coaches can only view their own practice sessions.");
      }
      if (coachSport && details.session.sport.trim().toLowerCase() !== coachSport.trim().toLowerCase()) {
        throw new ForbiddenError(
          `Unauthorized: You are assigned to ${coachSport} and cannot access ${details.session.sport} sessions.`
        );
      }
    }

    return NextResponse.json({ success: true, ...details });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
