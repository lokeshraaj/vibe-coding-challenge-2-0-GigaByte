import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole, resolveUserSport } from "@/lib/permissions/auth-guard";
import { closePracticeSession } from "@/modules/sessions/session-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["COACH"], req);
    const { id: sessionId } = await params;
    await connectToDatabase();

    const academyId = session.academyId;
    const coachId = session.coachId;

    if (!academyId || !coachId) {
      throw new ForbiddenError("Coach and academy identity required.");
    }

    const coachSport = await resolveUserSport(session);

    const closedSession = await closePracticeSession(
      academyId,
      coachId,
      sessionId,
      session.userId,
      coachSport || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Practice session closed and attendance locked successfully.",
      session: {
        id: closedSession._id.toString(),
        status: closedSession.status,
        closedAt: closedSession.closedAt?.toISOString(),
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
