import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { executePlayerCascadeDelete } from "@/modules/admin/cascade-delete-service";
import { Player, MatchParticipant, Attendance } from "@/models";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const player = await Player.findById(id)
      .populate("userId", "name email status")
      .populate("coachId", "sport coachCode")
      .populate("academyId", "name slug")
      .lean();

    if (!player) {
      throw new NotFoundError(`Player with ID '${id}' not found.`);
    }

    const [matchesCount, attendancesCount] = await Promise.all([
      MatchParticipant.countDocuments({ playerId: player._id }),
      Attendance.countDocuments({ playerId: player._id }),
    ]);

    return NextResponse.json({
      success: true,
      player,
      stats: {
        matchesCount,
        attendancesCount,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await executePlayerCascadeDelete({
      playerId: id,
      adminId: session.userId,
      reason: body.reason || "Super Admin player deletion",
      confirmName: body.confirmName,
      reauthPassword: body.reauthPassword,
      deleteUserAccount: body.deleteUserAccount ?? true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
