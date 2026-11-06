import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { getVerificationQueue } from "@/modules/admin/admin-service";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") as "ALL" | "PENDING" | "ACTIVE" | "SUSPICIOUS") || "ALL";
    const userType = (searchParams.get("userType") as "ALL" | "COACH" | "PLAYER") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getVerificationQueue({ filter, userType, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
