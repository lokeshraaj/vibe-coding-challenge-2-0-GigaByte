import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { coachInviteSchema } from "@/lib/validation/schemas";
import { createCoach, listCoachesByAcademy } from "@/modules/coaches/coach-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["PLATFORM_ADMIN", "ACADEMY_OWNER"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, coaches: [] });
    }

    const coaches = await listCoachesByAcademy(academyId);
    return NextResponse.json({ success: true, coaches });
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
    const validatedData = coachInviteSchema.parse(body);

    const coach = await createCoach(
      {
        academyId,
        ...validatedData,
      },
      session.userId
    );

    return NextResponse.json({ success: true, coach }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
