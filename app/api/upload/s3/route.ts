import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { uploadDirectToRailwayStorage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadDirectToRailwayStorage(file.name, file.type, buffer);

    const resourceType = file.type.startsWith("video")
      ? "video"
      : file.type.startsWith("audio")
      ? "audio"
      : "image";

    return NextResponse.json({
      secure_url: publicUrl,
      resource_type: resourceType,
      bytes: file.size,
    });
  } catch (error: any) {
    console.error("S3 upload route error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
