import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { forgotPasswordResetSchema } from "@/lib/validation/schemas";
import { completePasswordReset } from "@/modules/authentication/password-reset-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = forgotPasswordResetSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await completePasswordReset({
      resetToken: validatedData.resetToken,
      password: validatedData.password,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
