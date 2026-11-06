import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getAcademyByCode } from "@/modules/academies/academy-service";
import { verifyAcademyCodeSchema } from "@/lib/validation/schemas";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validatedData = verifyAcademyCodeSchema.parse(body);

    const academy = await getAcademyByCode(validatedData.academyCode);

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        academyName: academy.name,
        academyCode: academy.academyCode,
        city: academy.location?.city,
        state: academy.location?.state,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code") || searchParams.get("academyCode") || "";
    const validatedData = verifyAcademyCodeSchema.parse({ academyCode: code });

    const academy = await getAcademyByCode(validatedData.academyCode);

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        academyName: academy.name,
        academyCode: academy.academyCode,
        city: academy.location?.city,
        state: academy.location?.state,
      },
    });
  } catch (error) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
