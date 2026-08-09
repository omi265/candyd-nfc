import { NextRequest, NextResponse } from "next/server";
import { getS3ObjectStream } from "@/lib/storage";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await params;
    const fileKey = path.join("/");

    // Strict Ownership Verification (if media record exists in DB)
    if (session.user.role !== "ADMIN") {
      const media = await db.media.findFirst({
        where: {
          url: { contains: fileKey },
        },
        include: {
          memory: { select: { userId: true } },
        },
      });

      if (media && media.memory?.userId && media.memory.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this media asset" }, { status: 403 });
      }
    }

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
