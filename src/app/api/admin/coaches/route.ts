import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { Coach, Player } from "@/models";
import { handleApiError } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sport = searchParams.get("sport") || "ALL";
    const academyId = searchParams.get("academyId") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (sport !== "ALL") {
      query.sport = { $regex: new RegExp(`^${sport}$`, "i") };
    }

    if (academyId !== "ALL") {
      query.academyId = academyId;
    }

    if (status !== "ALL") {
      query.status = status;
    }

    const [coaches, total] = await Promise.all([
      Coach.find(query)
        .populate("userId", "name email status role")
        .populate("academyId", "name slug sports")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coach.countDocuments(query),
    ]);

    // Enhance each coach with assigned players count
    const coachIds = coaches.map((c) => c._id);
    const playerCounts = await Player.aggregate([
      { $match: { coachId: { $in: coachIds } } },
      { $group: { _id: "$coachId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(playerCounts.map((p) => [p._id.toString(), p.count]));

    const items = coaches.map((c: any) => ({
      id: c._id.toString(),
      coachCode: c.coachCode || "",
      sport: c.sport,
      assignedSports: c.assignedSports || [],
      specialization: c.specialization || "",
      experienceYears: c.experienceYears || 0,
      status: c.status,
      accountStatus: c.accountStatus,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      user: c.userId
        ? {
            id: c.userId._id ? c.userId._id.toString() : "",
            name: c.userId.name,
            email: c.userId.email,
            status: c.userId.status,
          }
        : null,
      academy: c.academyId
        ? {
            id: c.academyId._id ? c.academyId._id.toString() : "",
            name: c.academyId.name,
            slug: c.academyId.slug,
            sports: c.academyId.sports || [],
          }
        : null,
      assignedPlayersCount: countMap.get(c._id.toString()) || 0,
    }));

    // Filter by search text (name, email, code) if provided
    const filteredItems = search
      ? items.filter(
          (c) =>
            c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
            c.coachCode?.toLowerCase().includes(search.toLowerCase()) ||
            c.sport?.toLowerCase().includes(search.toLowerCase())
        )
      : items;

    return NextResponse.json({
      success: true,
      items: filteredItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
