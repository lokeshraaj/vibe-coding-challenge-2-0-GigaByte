import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { resendOtpSchema } from "@/lib/validation/schemas";
import { resendRegistrationOtp } from "@/modules/authentication/registration-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = resendOtpSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await resendRegistrationOtp({
      athlixId: validatedData.athlixId,
      ipAddress: clientIp,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
