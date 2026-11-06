import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getAuthSession } from "@/lib/permissions/auth-guard";
import { User, Academy } from "@/models";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const user = await User.findById(session.userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 404 });
    }

    // Active session revocation for blocked users
    if (user.status === "BLOCKED") {
      return NextResponse.json(
        {
          success: false,
          error: `Your account has been blocked by Platform Administration${user.blockedReason ? `: ${user.blockedReason}` : "."}`,
          user: null,
        },
        { status: 403 }
      );
    }

    let academy = null;
    if (session.academyId) {
      academy = await Academy.findById(session.academyId).select("name slug logo status blockedReason").lean();

      // Tenant-level blocking revocation for non-platform admins
      if (user.role !== "PLATFORM_ADMIN" && user.role !== "SUPER_ADMIN" && academy && academy.status === "BLOCKED") {
        return NextResponse.json(
          {
            success: false,
            error: `Your sports academy tenant has been blocked by Platform Administration${academy.blockedReason ? `: ${academy.blockedReason}` : "."}`,
            user: null,
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        academyId: user.academyId?.toString(),
        coachId: session.coachId,
        playerId: user.playerId?.toString(),
        status: user.status,
        academy,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
