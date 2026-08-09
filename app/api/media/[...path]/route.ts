import { NextRequest, NextResponse } from "next/server";
import { getS3ObjectStream } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const fileKey = path.join("/");

    const { stream, contentType, contentLength } = await getS3ObjectStream(fileKey);

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Length": contentLength ? String(contentLength) : "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Media proxy stream error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
