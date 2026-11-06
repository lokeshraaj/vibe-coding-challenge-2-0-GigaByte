import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole, resolveUserSport } from "@/lib/permissions/auth-guard";
import { matchCreateSchema } from "@/lib/validation/schemas";
import { createMatch, listMatchesByCoach } from "@/modules/matches/match-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { Scout } from "@/models";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER", "PLATFORM_ADMIN", "SCOUT"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const { searchParams } = new URL(req.url);
    let coachId = searchParams.get("coachId") || undefined;
    const userSport = await resolveUserSport(session);

    if (session.role === "COACH") {
      coachId = session.coachId;
    } else if (session.role === "SCOUT") {
      const scoutRecord = await Scout.findOne({ userId: session.userId, academyId });
      coachId = scoutRecord?.assignedCoachId?.toString();
    }

    if (!coachId) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const matches = await listMatchesByCoach(academyId, coachId, userSport);
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

    const coachSport = await resolveUserSport(session);
    const body = await req.json();

    if (body.sport && coachSport && body.sport.trim().toLowerCase() !== coachSport.trim().toLowerCase()) {
      throw new ForbiddenError(
        `Access denied: You are assigned to ${coachSport} and cannot create matches for ${body.sport}.`
      );
    }

    const validatedData = matchCreateSchema.parse({
      ...body,
      coachId,
      sport: coachSport || body.sport,
    });

    const match = await createMatch(
      {
        academyId,
        ...validatedData,
      },
      coachSport
    );

    return NextResponse.json({ success: true, match }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
