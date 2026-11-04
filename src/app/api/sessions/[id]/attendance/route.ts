import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { attendanceBatchSchema } from "@/lib/validation/schemas";
import { saveAttendance } from "@/modules/sessions/session-service";
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

    const body = await req.json();
    const validatedData = attendanceBatchSchema.parse({
      sessionId,
      records: body.records,
    });

    const result = await saveAttendance({
      academyId,
      coachId,
      sessionId: validatedData.sessionId,
      records: validatedData.records,
    });

    return NextResponse.json({ ...result });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
