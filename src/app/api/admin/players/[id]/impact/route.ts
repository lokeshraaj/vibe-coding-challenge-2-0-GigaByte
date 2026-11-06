import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { calculatePlayerImpact } from "@/modules/admin/cascade-delete-service";
import { handleApiError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const impact = await calculatePlayerImpact(id);

    return NextResponse.json({ success: true, impact });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
