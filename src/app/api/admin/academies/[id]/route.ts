import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { getAcademyDetails } from "@/modules/admin/admin-service";
import { executeAcademyCascadeDelete } from "@/modules/admin/cascade-delete-service";
import { Academy, AuditLog } from "@/models";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const details = await getAcademyDetails(id);
    return NextResponse.json({ success: true, ...details });
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

    const academy = await Academy.findById(id);
    if (!academy) {
      throw new NotFoundError(`Academy with ID '${id}' not found.`);
    }

    if (body.name) academy.name = body.name.trim();
    if (body.slug) {
      const slugVal = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await Academy.findOne({ slug: slugVal, _id: { $ne: academy._id } });
      if (existing) {
        throw new BadRequestError(`Slug '${slugVal}' is already taken by another academy.`);
      }
      academy.slug = slugVal;
    }
    if (body.description !== undefined) academy.description = body.description.trim();
    if (body.sports && Array.isArray(body.sports)) {
      academy.sports = body.sports.map((s: string) => s.trim()).filter(Boolean);
    }
    if (body.contactEmail) academy.contactEmail = body.contactEmail.trim().toLowerCase();
    if (body.contactPhone) academy.contactPhone = body.contactPhone.trim();
    if (body.location && typeof body.location === "object") {
      academy.location = {
        ...academy.location,
        ...body.location,
      };
    }

    await academy.save();

    await AuditLog.create({
      actorId: session.userId,
      actorRole: session.role,
      action: "UPDATE_ACADEMY_DETAILS",
      resourceType: "ACADEMY",
      resourceId: id,
      reason: body.reason || "Super Admin updated academy details",
      status: "SUCCESS",
      details: { updatedFields: body },
    });

    return NextResponse.json({
      success: true,
      message: `Academy '${academy.name}' updated successfully.`,
      academy,
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

    const result = await executeAcademyCascadeDelete({
      academyId: id,
      adminId: session.userId,
      reason: body.reason || "Super Admin cascade deletion",
      confirmName: body.confirmName || "",
      reauthPassword: body.reauthPassword,
    });

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
