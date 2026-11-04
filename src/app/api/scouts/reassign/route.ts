import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { reassignScout } from "@/modules/scouts/scout-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const session = await requireRole(["PLATFORM_ADMIN", "ACADEMY_OWNER"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const { scoutId, newCoachId } = await req.json();
    if (!scoutId || !newCoachId) {
      return NextResponse.json({ success: false, error: "scoutId and newCoachId are required" }, { status: 400 });
    }

    const result = await reassignScout(academyId, scoutId, newCoachId);
    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
