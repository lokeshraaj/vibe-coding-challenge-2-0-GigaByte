import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { updateComplaintStatus } from "@/modules/admin/admin-service";
import { handleApiError } from "@/lib/errors";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json();

    const result = await updateComplaintStatus({
      complaintId: id,
      status: body.status,
      internalNotes: body.internalNotes,
      resolutionNotes: body.resolutionNotes,
      assignedAdminId: body.assignedAdminId,
      adminId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
