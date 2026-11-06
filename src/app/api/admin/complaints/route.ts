import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin, requireAuth } from "@/lib/permissions/auth-guard";
import { getComplaints } from "@/modules/admin/admin-service";
import { Complaint, AuditLog } from "@/models";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const result = await getComplaints({ status, category, page, limit });
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

    const body = await req.json();
    const complaint = await Complaint.create({
      reporterId: session.userId,
      reporterRole: session.role,
      targetType: body.targetType || "OTHER",
      targetId: body.targetId || "SYSTEM",
      targetName: body.targetName || "",
      academyId: session.academyId || null,
      subject: body.subject,
      category: body.category || "OTHER",
      description: body.description,
      evidenceUrls: body.evidenceUrls || [],
      status: "OPEN",
    });

    await AuditLog.create({
      actorId: session.userId,
      action: "SUBMIT_REPORT",
      resourceType: "COMPLAINT",
      resourceId: complaint._id.toString(),
      reason: body.subject,
      status: "SUCCESS",
    });

    return NextResponse.json({ success: true, complaint }, { status: 201 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
