import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth } from "@/lib/permissions/auth-guard";
import { playerSchema } from "@/lib/validation/schemas";
import { createPlayer, listPlayers } from "@/modules/players/player-service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: true, items: [], pagination: { totalCount: 0 } });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const sport = searchParams.get("sport") || undefined;
    const status = searchParams.get("status") || "ACTIVE";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let coachId = searchParams.get("coachId") || undefined;

    // Strict coach data isolation: Coach can ONLY list their own players!
    if (session.role === "COACH") {
      coachId = session.coachId;
    }

    const result = await listPlayers({
      academyId,
      coachId,
      sport,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    await connectToDatabase();

    if (session.role !== "COACH" && session.role !== "ACADEMY_OWNER" && session.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenError("Only coaches and academy administrators can register players.");
    }

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = playerSchema.parse(body);

    // Enforce coachId scoping: If actor is a coach, force coachId to their own ID!
    let assignedCoachId = validatedData.coachId;
    if (session.role === "COACH") {
      if (!session.coachId) {
        throw new ForbiddenError("No coach profile associated with this account.");
      }
      assignedCoachId = session.coachId;
    }

    const player = await createPlayer(
      {
        academyId,
        ...validatedData,
        coachId: assignedCoachId,
      },
      session.userId
    );

    return NextResponse.json({ success: true, player }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
