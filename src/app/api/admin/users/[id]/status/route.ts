import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/permissions/auth-guard";
import { updateUserStatus } from "@/modules/admin/admin-service";
import { handleApiError } from "@/lib/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json();

    const result = await updateUserStatus({
      targetUserId: id,
      status: body.status,
      reason: body.reason,
      adminId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
