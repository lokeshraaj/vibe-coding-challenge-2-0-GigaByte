import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/permissions/auth-guard";
import { getPlatformSettings, updatePlatformSettings } from "@/modules/admin/admin-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);
    await connectToDatabase();

    const settings = await getPlatformSettings();
    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSuperAdmin(req);
    await connectToDatabase();

    const body = await req.json();
    const result = await updatePlatformSettings({
      sports: body.sports,
      controls: body.controls,
      adminId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
