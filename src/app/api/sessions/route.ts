import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireRole, resolveUserSport } from "@/lib/permissions/auth-guard";
import { sessionCreateSchema } from "@/lib/validation/schemas";
import { createPracticeSession, listSessionsByCoach } from "@/modules/sessions/session-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER", "PLATFORM_ADMIN"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    const { searchParams } = new URL(req.url);
    let coachId = searchParams.get("coachId") || undefined;
    let coachSport: string | undefined = undefined;

    if (session.role === "COACH") {
      coachId = session.coachId;
      const sport = await resolveUserSport(session);
      if (sport) coachSport = sport;
    }

    if (!coachId) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    const sessions = await listSessionsByCoach(academyId, coachId, coachSport);
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["COACH", "ACADEMY_OWNER"], req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = sessionCreateSchema.parse(body);

    let coachId = validatedData.coachId;
    let coachSport: string | undefined = undefined;

    if (session.role === "COACH") {
      if (!session.coachId) {
        throw new ForbiddenError("No coach profile associated with this account.");
      }
      coachId = session.coachId;
      const resolvedSport = await resolveUserSport(session);
      if (resolvedSport) {
        coachSport = resolvedSport;
        if (
          validatedData.sport &&
          validatedData.sport.trim().toLowerCase() !== resolvedSport.trim().toLowerCase()
        ) {
          throw new ForbiddenError(
            `Unauthorized sport: You are restricted to ${resolvedSport} and cannot create a ${validatedData.sport} session.`
          );
        }
        validatedData.sport = resolvedSport;
      }
    }

    const newSession = await createPracticeSession(
      {
        academyId,
        ...validatedData,
        coachId,
      },
      coachSport
    );

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
