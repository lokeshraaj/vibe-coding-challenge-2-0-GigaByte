import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireAuth, resolveUserSport } from "@/lib/permissions/auth-guard";
import { playerSchema } from "@/lib/validation/schemas";
import { createPlayer, listPlayers } from "@/modules/players/player-service";
import { getScoutTalentDirectory } from "@/modules/eligibility/eligibility-service";
import { Scout } from "@/models";
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
    const requestedSport = searchParams.get("sport") || undefined;
    const status = searchParams.get("status") || "ACTIVE";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let coachId = searchParams.get("coachId") || undefined;
    let effectiveSport = requestedSport;

    // Strict coach data isolation: Coach can ONLY list their own players and assigned sport!
    if (session.role === "COACH") {
      coachId = session.coachId;
      const coachSport = await resolveUserSport(session);
      if (
        requestedSport &&
        coachSport &&
        requestedSport !== "ALL" &&
        requestedSport.trim().toLowerCase() !== coachSport.trim().toLowerCase()
      ) {
        throw new ForbiddenError(
          `Access denied: You are assigned to ${coachSport} and cannot view players belonging to ${requestedSport}.`
        );
      }
      effectiveSport = coachSport || requestedSport;
    }

    // Strict scout restriction: Scout can ONLY see READY players under their assigned coach & sport!
    if (session.role === "SCOUT") {
      let targetCoachId = session.coachId;
      if (!targetCoachId) {
        const scoutRecord = await Scout.findOne({
          userId: session.userId,
          academyId,
        });
        if (scoutRecord && scoutRecord.assignedCoachId) {
          targetCoachId = scoutRecord.assignedCoachId.toString();
        }
      }

      if (!targetCoachId) {
        return NextResponse.json({
          success: true,
          items: [],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }

      const scoutSport = await resolveUserSport(session);
      if (
        requestedSport &&
        scoutSport &&
        requestedSport !== "ALL" &&
        requestedSport.trim().toLowerCase() !== scoutSport.trim().toLowerCase()
      ) {
        throw new ForbiddenError(
          `Access denied: You are assigned to ${scoutSport} and cannot search or view players belonging to ${requestedSport}.`
        );
      }

      effectiveSport = scoutSport || requestedSport;

      // Fetch ONLY trial-ready players under assigned coach and assigned sport
      const eligiblePlayers = await getScoutTalentDirectory(academyId, targetCoachId, {
        sport: effectiveSport,
        search,
      });

      const mappedItems = eligiblePlayers.map((ep) => ({
        id: ep.playerId,
        name: ep.playerName,
        sport: ep.sport,
        position: ep.position,
        eligibilityStatus: ep.status,
        attendancePercentage: ep.attendancePercentage,
        matchesPlayed: ep.matchesPlayed,
        coachId: targetCoachId,
        status: "ACTIVE",
      }));

      return NextResponse.json({
        success: true,
        items: mappedItems,
        pagination: {
          page: 1,
          limit: Math.max(1, mappedItems.length),
          totalCount: mappedItems.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    const result = await listPlayers({
      academyId,
      coachId,
      sport: effectiveSport,
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

    // Strict Invariant: Player creation MUST remain exclusively under Coach.
    // Academy Admin CANNOT add players. Scout CANNOT add players.
    if (session.role !== "COACH") {
      throw new ForbiddenError(
        "Player creation is restricted exclusively to coaches. Academy administrators and scouts are not permitted to add players."
      );
    }

    const academyId = session.academyId;
    if (!academyId) {
      return NextResponse.json({ success: false, error: "Academy context missing" }, { status: 400 });
    }

    if (!session.coachId) {
      throw new ForbiddenError("No coach profile associated with this account.");
    }

    const coachSport = await resolveUserSport(session);
    const body = await req.json();

    if (body.sport && coachSport && body.sport.trim().toLowerCase() !== coachSport.trim().toLowerCase()) {
      throw new ForbiddenError(
        `Access denied: You are assigned to ${coachSport} and cannot enroll players in ${body.sport}.`
      );
    }

    const validatedData = playerSchema.parse({
      ...body,
      sport: coachSport || body.sport,
    });

    const player = await createPlayer(
      {
        academyId,
        ...validatedData,
        coachId: session.coachId,
      },
      session.userId
    );

    return NextResponse.json({ success: true, player }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
