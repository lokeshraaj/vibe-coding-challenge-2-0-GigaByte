import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requirePlatformAdmin } from "@/lib/permissions/auth-guard";
import { getUserDetails } from "@/modules/admin/admin-service";
import { executeUserCascadeDelete } from "@/modules/admin/cascade-delete-service";
import { User, AuditLog } from "@/models";
import { handleApiError, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { validateAndNormalizePhone } from "@/lib/validation/phone";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin(req);
    await connectToDatabase();

    const { id } = await params;
    const details = await getUserDetails(id);
    return NextResponse.json({ success: true, ...details });
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

    const result = await executeUserCascadeDelete({
      userId: id,
      adminId: session.userId,
      reason: body.reason || "Super Admin user deletion",
      confirmEmail: body.confirmEmail,
      reauthPassword: body.reauthPassword,
      reassignCoachId: body.reassignCoachId,
    });

    return NextResponse.json(result);
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

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found.`);
    }

    // Protect SUPER_ADMIN role modification
    if (user.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Only a Super Admin can modify a Super Admin profile.");
    }

    if (body.name && typeof body.name === "string") {
      user.name = body.name.trim();
    }

    if (body.phone !== undefined) {
      const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (rawPhone) {
        const phoneCheck = validateAndNormalizePhone(rawPhone);
        if (!phoneCheck.isValid) {
          throw new BadRequestError(phoneCheck.error || "Invalid phone number.");
        }
        user.metadata = {
          ...user.metadata,
          phone: phoneCheck.e164!,
        };
      } else {
        user.metadata = {
          ...user.metadata,
          phone: "",
        };
      }
    }

    if (body.role && ["PLATFORM_ADMIN", "ACADEMY_OWNER", "COACH", "SCOUT", "PLAYER"].includes(body.role)) {
      if (session.role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Only Primary SUPER_ADMIN can modify user roles.");
      }
      user.role = body.role;
    }

    await user.save();

    await AuditLog.create({
      actorId: session.userId,
      actorRole: session.role,
      action: "UPDATE_USER_DETAILS",
      resourceType: "USER",
      resourceId: id,
      reason: body.reason || "Updated user profile details",
      status: "SUCCESS",
      details: {
        updatedFields: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User '${user.name}' updated successfully.`,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
