import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { executePlayerCascadeDelete } from "@/modules/admin/cascade-delete-service";
import { handleApiError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json();

    const result = await executePlayerCascadeDelete({
      playerId: id,
      adminId: session.userId,
      reason: body.reason,
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
