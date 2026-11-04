import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { scoutInviteSchema } from "@/lib/validation/schemas";
import { createScout, listScoutsByAcademy } from "@/modules/scouts/scout-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["PLATFORM_ADMIN", "ACADEMY_OWNER"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, scouts: [] });
    }

    const scouts = await listScoutsByAcademy(academyId);
    return NextResponse.json({ success: true, scouts });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["PLATFORM_ADMIN", "ACADEMY_OWNER"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json(
        { success: false, error: "Academy context missing" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = scoutInviteSchema.parse(body);

    const scout = await createScout({
      academyId,
      ...validatedData,
    });

    return NextResponse.json({ success: true, scout }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
