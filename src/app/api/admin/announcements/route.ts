import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { getAnnouncements, createAnnouncement } from "@/modules/admin/admin-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const announcements = await getAnnouncements();
    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const body = await req.json();
    const result = await createAnnouncement({
      title: body.title,
      content: body.content,
      category: body.category || "GENERAL",
      priority: body.priority || "NORMAL",
      targetAudience: body.targetAudience || "ALL",
      adminId: session.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
