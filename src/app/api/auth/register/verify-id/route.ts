import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { verifyIdSchema } from "@/lib/validation/schemas";
import { initiateIdRegistration } from "@/modules/authentication/registration-service";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = verifyIdSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    const result = await initiateIdRegistration({
      academyCode: validatedData.academyCode,
      athlixId: validatedData.athlixId,
      role: validatedData.role,
      ipAddress: clientIp,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
