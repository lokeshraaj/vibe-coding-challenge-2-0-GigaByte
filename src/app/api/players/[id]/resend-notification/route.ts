import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/permissions/auth-guard";
import { resendPlayerNotification } from "@/modules/players/player-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    if (session.role !== "COACH" && session.role !== "ACADEMY_OWNER" && session.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenError("Insufficient permissions to resend player notifications.");
    }

    const { id } = await params;
    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const result = await resendPlayerNotification(academyId, id);
    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
