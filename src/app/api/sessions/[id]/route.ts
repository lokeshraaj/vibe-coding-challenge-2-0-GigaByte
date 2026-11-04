import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
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

    const details = await getSessionDetails(academyId, sessionId);

    // Enforce coach boundary
    if (session.role === "COACH" && details.session.coachId !== session.coachId) {
      throw new ForbiddenError("Unauthorized: Coaches can only view their own practice sessions.");
    }

    return NextResponse.json({ success: true, ...details });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
