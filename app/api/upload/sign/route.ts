import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/auth";

export async function POST(request: Request) {
    const session = await auth();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paramsToSign } = body;

    // Use standard upload type
    const enforcedParams = {
        ...paramsToSign,
        type: "authenticated",
    };

    const signature = cloudinary.utils.api_sign_request(
        enforcedParams,
        process.env.CLOUDINARY_API_SECRET as string
    );

    return NextResponse.json({ signature });
}
