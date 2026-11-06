import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { resendScoutNotification } from "@/modules/scouts/scout-service";
import { handleApiError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["PLATFORM_ADMIN", "ACADEMY_OWNER"], req);
    const { id: scoutId } = await params;
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json(
        { success: false, error: "Academy context missing" },
        { status: 400 }
      );
    }

    const result = await resendScoutNotification(academyId, scoutId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
