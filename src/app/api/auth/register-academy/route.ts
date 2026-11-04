import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { academyRegisterSchema } from "@/lib/validation/schemas";
import { registerAcademy } from "@/modules/academies/academy-service";
import { signSessionToken } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/cookies";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = academyRegisterSchema.parse(body);

    const result = await registerAcademy(validatedData);

    // Automatically authenticate the new owner
    const token = await signSessionToken({
      userId: result.owner.id,
      email: result.owner.email,
      name: result.owner.name,
      role: "ACADEMY_OWNER",
      academyId: result.academy.id,
    });

    await setAuthCookie(token);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
