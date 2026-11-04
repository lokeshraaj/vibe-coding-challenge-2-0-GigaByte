import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole } from "@/lib/permissions/auth-guard";
import { matchCreateSchema } from "@/lib/validation/schemas";
import { createMatch, listMatchesByCoach } from "@/modules/matches/match-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER", "PLATFORM_ADMIN"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const { searchParams } = new URL(req.url);
    let coachId = searchParams.get("coachId") || undefined;

    if (session.role === "COACH") {
      coachId = session.coachId;
    }

    if (!coachId) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const matches = await listMatchesByCoach(academyId, coachId);
    return NextResponse.json({ success: true, matches });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["COACH"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    const coachId = session.coachId;

    if (!academyId || !coachId) {
      throw new ForbiddenError("Coach and academy identity required.");
    }

    const body = await req.json();
    const validatedData = matchCreateSchema.parse({
      ...body,
      coachId,
    });

    const match = await createMatch({
      academyId,
      ...validatedData,
    });

    return NextResponse.json({ success: true, match }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
