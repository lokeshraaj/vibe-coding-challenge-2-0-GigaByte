import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { Coach, User, Academy, Player, PracticeSession, Attendance, AuditLog } from "@/models";
import { executeCoachCascadeDelete } from "@/modules/admin/cascade-delete-service";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const coach = await Coach.findById(id)
      .populate("userId", "name email role status metadata")
      .populate("academyId", "name slug sports")
      .lean();

    if (!coach) {
      throw new NotFoundError(`Coach with ID '${id}' not found.`);
    }

    const [players, sessionsCount, attendancesCount] = await Promise.all([
      Player.find({ coachId: coach._id }).select("name playerCode sport position status").lean(),
      PracticeSession.countDocuments({ coachId: coach._id }),
      Attendance.countDocuments({ coachId: coach._id }),
    ]);

    return NextResponse.json({
      success: true,
      coach,
      players,
      stats: {
        playersCount: players.length,
        sessionsCount,
        attendancesCount,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json();

    const coach = await Coach.findById(id);
    if (!coach) {
      throw new NotFoundError(`Coach with ID '${id}' not found.`);
    }

    const academy = await Academy.findById(body.academyId || coach.academyId);
    if (!academy) {
      throw new NotFoundError("Target academy not found.");
    }

    // Sport validation
    if (body.sport) {
      const normalizedSport = body.sport.trim();
      const supportedSports = (academy.sports || []).map((s: string) => s.trim().toLowerCase());
      if (supportedSports.length > 0 && !supportedSports.includes(normalizedSport.toLowerCase())) {
        throw new BadRequestError(
          `Academy '${academy.name}' does not support sport '${normalizedSport}'. Supported sports: ${(academy.sports || []).join(", ")}`
        );
      }
      coach.sport = normalizedSport;
    }

    // Academy transfer validation
    if (body.academyId && body.academyId.toString() !== coach.academyId.toString()) {
      const newAcademyId = new mongoose.Types.ObjectId(body.academyId);
      // Detach players from the old academy since they don't transfer across academies automatically
      await Player.updateMany(
        { coachId: coach._id },
        { $set: { coachId: null } }
      );
      coach.academyId = newAcademyId;

      // Update linked user academyId
      if (coach.userId) {
        await User.findByIdAndUpdate(coach.userId, { academyId: newAcademyId });
      }
    }

    if (body.specialization !== undefined) {
      coach.specialization = body.specialization.trim();
    }
    if (body.experienceYears !== undefined) {
      coach.experienceYears = Number(body.experienceYears) || 0;
    }
    if (body.bio !== undefined) {
      coach.bio = body.bio.trim();
    }
    if (body.phone !== undefined) {
      coach.phone = body.phone.trim();
    }

    await coach.save();

    // If name or email updated, update User document
    if (coach.userId && (body.name || body.phone)) {
      await User.findByIdAndUpdate(coach.userId, {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.phone ? { "metadata.phone": body.phone.trim() } : {}),
      });
    }

    await AuditLog.create({
      actorId: session.userId,
      actorRole: session.role,
      action: "UPDATE_COACH_ASSIGNMENT",
      resourceType: "COACH",
      resourceId: id,
      reason: body.reason || "Super Admin modified coach details/assignment",
      status: "SUCCESS",
      details: {
        sport: coach.sport,
        academyId: coach.academyId.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coach details and assignments updated successfully.",
      coach,
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await executeCoachCascadeDelete({
      coachId: id,
      adminId: session.userId,
      reason: body.reason || "Super Admin coach deletion",
      confirmName: body.confirmName,
      reauthPassword: body.reauthPassword,
      reassignCoachId: body.reassignCoachId,
      deleteUserAccount: body.deleteUserAccount ?? true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
